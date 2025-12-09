-- ============================================
-- NEO AI CHATBOT - DATABASE SCHEMA
-- PostgreSQL Memory System
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- SESSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255),  -- For future auth, nullable for now
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    current_mode VARCHAR(50) DEFAULT 'visitor',
    message_count INTEGER DEFAULT 0,
    summary TEXT,
    ip_address VARCHAR(45),  -- IPv6-compatible
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    
    CONSTRAINT sessions_mode_check CHECK (current_mode IN ('visitor', 'explorer', 'applicant', 'builder', 'operator'))
);

CREATE INDEX idx_sessions_last_active ON sessions(last_active_at);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);

-- ============================================
-- MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    mode VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    token_count INTEGER,
    rag_sources JSONB,  -- Array of source documents used
    plan_id UUID,  -- Reference to plan if message is part of planning
    metadata JSONB DEFAULT '{}',
    
    CONSTRAINT messages_role_check CHECK (role IN ('user', 'assistant', 'system'))
);

CREATE INDEX idx_messages_session ON messages(session_id, created_at);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- ============================================
-- MEMORY SUMMARIES TABLE
-- Compressed long-term memory
-- ============================================
CREATE TABLE IF NOT EXISTS memory_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    summary TEXT NOT NULL,
    message_range_start INTEGER NOT NULL,  -- Starting message number
    message_range_end INTEGER NOT NULL,    -- Ending message number
    importance_score FLOAT DEFAULT 0.5,     -- 0-1 scale
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_summaries_session ON memory_summaries(session_id, created_at);

-- ============================================
-- USER GOALS TABLE
-- Track user objectives across sessions
-- ============================================
CREATE TABLE IF NOT EXISTS user_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    goal TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    
    CONSTRAINT goals_status_check CHECK (status IN ('active', 'completed', 'abandoned'))
);

CREATE INDEX idx_goals_session ON user_goals(session_id, status);

-- ============================================
-- PLANS TABLE
-- Multi-step planning and execution
-- ============================================
CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    goal TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    
    CONSTRAINT plans_status_check CHECK (status IN ('active', 'completed', 'failed', 'revised'))
);

CREATE INDEX idx_plans_session ON plans(session_id, status);

-- ============================================
-- PLAN STEPS TABLE
-- Individual steps within a plan
-- ============================================
CREATE TABLE IF NOT EXISTS plan_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    result TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    
    CONSTRAINT steps_status_check CHECK (status IN ('pending', 'in_progress', 'completed', 'failed'))
);

CREATE INDEX idx_steps_plan ON plan_steps(plan_id, step_number);

-- ============================================
-- ANALYTICS EVENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT
);

CREATE INDEX idx_analytics_type ON analytics_events(event_type, created_at);
CREATE INDEX idx_analytics_session ON analytics_events(session_id, created_at);

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Update last_active_at on sessions
CREATE OR REPLACE FUNCTION update_session_activity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE sessions 
    SET last_active_at = CURRENT_TIMESTAMP,
        message_count = message_count + 1
    WHERE id = NEW.session_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_session_activity
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_session_activity();

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_goals_updated_at
BEFORE UPDATE ON user_goals
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_plans_updated_at
BEFORE UPDATE ON plans
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_steps_updated_at
BEFORE UPDATE ON plan_steps
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- ============================================
-- VIEWS
-- ============================================

-- Recent sessions with message counts
CREATE OR REPLACE VIEW recent_sessions AS
SELECT 
    s.id,
    s.created_at,
    s.last_active_at,
    s.current_mode,
    s.message_count,
    COUNT(DISTINCT m.id) as actual_message_count,
    COUNT(DISTINCT p.id) as plan_count,
    COUNT(DISTINCT g.id) as goal_count
FROM sessions s
LEFT JOIN messages m ON s.id = m.session_id
LEFT JOIN plans p ON s.id = p.session_id
LEFT JOIN user_goals g ON s.id = g.session_id
GROUP BY s.id
ORDER BY s.last_active_at DESC;

-- Session memory context (for retrieval)
CREATE OR REPLACE VIEW session_memory_context AS
SELECT 
    s.id as session_id,
    s.summary as session_summary,
    array_agg(DISTINCT ms.summary) as memory_summaries,
    array_agg(DISTINCT g.goal) FILTER (WHERE g.status = 'active') as active_goals,
    array_agg(DISTINCT p.goal) FILTER (WHERE p.status = 'active') as active_plans
FROM sessions s
LEFT JOIN memory_summaries ms ON s.id = ms.session_id
LEFT JOIN user_goals g ON s.id = g.session_id
LEFT JOIN plans p ON s.id = p.session_id
GROUP BY s.id, s.summary;

-- ============================================
-- SEED DATA (Optional)
-- ============================================

-- Comment out in production
-- INSERT INTO sessions (id, current_mode, summary, ip_address) VALUES
-- (uuid_generate_v4(), 'visitor', 'Test session', '127.0.0.1');
