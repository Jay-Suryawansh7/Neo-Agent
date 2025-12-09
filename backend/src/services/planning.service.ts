/**
 * Planning Service
 * Multi-step planning and execution engine
 */

import { pool } from '../db/connection';
import { Plan, PlanStep } from '../../../shared/types';
import { v4 as uuidv4 } from 'uuid';
import { aiService } from './ai.service';
import { NeoMode } from '../../../shared/types';

class PlanningService {
  /**
   * Create a new plan
   */
  async createPlan(sessionId: string, goal: string, steps: string[]): Promise<Plan> {
    const planId = uuidv4();

    // Insert plan
    await pool.query(
      'INSERT INTO plans (id, session_id, goal, status) VALUES ($1, $2, $3, $4)',
      [planId, sessionId, goal, 'active']
    );

    // Insert steps
    for (let i = 0; i < steps.length; i++) {
      await pool.query(
        'INSERT INTO plan_steps (id, plan_id, step_number, description, status) VALUES ($1, $2, $3, $4, $5)',
        [uuidv4(), planId, i + 1, steps[i], 'pending']
      );
    }

    return this.getPlan(planId);
  }

  /**
   * Get plan by ID
   */
  async getPlan(planId: string): Promise<Plan> {
    const planResult = await pool.query('SELECT * FROM plans WHERE id = $1', [planId]);
    const stepsResult = await pool.query(
      'SELECT * FROM plan_steps WHERE plan_id = $1 ORDER BY step_number ASC',
      [planId]
    );

    const plan = planResult.rows[0];
    const steps: PlanStep[] = stepsResult.rows.map(row => ({
      id: row.id,
      planId: row.plan_id,
      stepNumber: row.step_number,
      description: row.description,
      status: row.status,
      result: row.result,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return {
      id: plan.id,
      sessionId: plan.session_id,
      goal: plan.goal,
      steps,
      status: plan.status,
      createdAt: plan.created_at,
      updatedAt: plan.updated_at,
    };
  }

  /**
   * Get active plans for session
   */
  async getActivePlans(sessionId: string): Promise<Plan[]> {
    const result = await pool.query(
      'SELECT id FROM plans WHERE session_id = $1 AND status = $2 ORDER BY created_at DESC',
      [sessionId, 'active']
    );

    const plans = await Promise.all(
      result.rows.map(row => this.getPlan(row.id))
    );

    return plans;
  }

  /**
   * Update step status
   */
  async updateStepStatus(
    stepId: string,
    status: 'pending' | 'in_progress' | 'completed' | 'failed',
    result?: string
  ): Promise<void> {
    await pool.query(
      'UPDATE plan_steps SET status = $1, result = $2 WHERE id = $3',
      [status, result, stepId]
    );

    // If step completed or failed, check if plan should be updated
    if (status === 'completed' || status === 'failed') {
      await this.checkPlanCompletion(stepId);
    }
  }

  /**
   * Generate plan from goal using AI
   */
  async generatePlan(sessionId: string, goal: string): Promise<Plan> {
    const planningPrompt = `Break down the following goal into clear, sequential steps:

Goal: ${goal}

Provide a numbered list of specific, actionable steps.`;

    const response = await aiService.generateCompletion({
      messages: [{ role: 'user', content: planningPrompt }],
      mode: NeoMode.BUILDER,
    });

    // Parse steps from response
    const steps = this.parseStepsFromResponse(response);

    return this.createPlan(sessionId, goal, steps);
  }

  /**
   * Revise plan based on results
   */
  async revisePlan(planId: string, reason: string): Promise<Plan> {
    const plan = await this.getPlan(planId);

    // Mark current plan as revised
    await pool.query(
      'UPDATE plans SET status = $1 WHERE id = $2',
      ['revised', planId]
    );

    // Get completed steps
    const completedSteps = plan.steps
      .filter(s => s.status === 'completed')
      .map(s => s.description);

    const revisionPrompt = `The previous plan for "${plan.goal}" needs revision.

Completed steps:
${completedSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Reason for revision: ${reason}

Provide a revised plan with remaining steps.`;

    const response = await aiService.generateCompletion({
      messages: [{ role: 'user', content: revisionPrompt }],
      mode: NeoMode.BUILDER,
    });

    const newSteps = this.parseStepsFromResponse(response);
    return this.createPlan(plan.sessionId, plan.goal, newSteps);
  }

  /**
   * Build planning context for AI
   */
  async buildPlanningContext(sessionId: string): Promise<string> {
    const plans = await this.getActivePlans(sessionId);

    if (plans.length === 0) {
      return '';
    }

    const contextParts: string[] = ['## Active Plans:'];

    plans.forEach(plan => {
      contextParts.push(`\nPlan: ${plan.goal}`);
      contextParts.push(`Status: ${plan.status}`);
      contextParts.push('Steps:');
      plan.steps.forEach(step => {
        contextParts.push(`  ${step.stepNumber}. [${step.status}] ${step.description}`);
        if (step.result) {
          contextParts.push(`     Result: ${step.result}`);
        }
      });
    });

    return contextParts.join('\n');
  }

  // Private helpers

  private parseStepsFromResponse(response: string): string[] {
    // Extract numbered steps from AI response
    const lines = response.split('\n');
    const steps: string[] = [];

    for (const line of lines) {
      const match = line.match(/^\d+\.\s*(.+)/);
      if (match) {
        steps.push(match[1].trim());
      }
    }

    return steps.length > 0 ? steps : ['Step not parsed correctly'];
  }

  private async checkPlanCompletion(stepId: string): Promise<void> {
    const stepResult = await pool.query('SELECT plan_id FROM plan_steps WHERE id = $1', [stepId]);
    const planId = stepResult.rows[0].plan_id;

    const stepsResult = await pool.query(
      'SELECT status FROM plan_steps WHERE plan_id = $1',
      [planId]
    );

    const statuses = stepsResult.rows.map(r => r.status);
    const allCompleted = statuses.every(s => s === 'completed');
    const anyFailed = statuses.some(s => s === 'failed');

    if (allCompleted) {
      await pool.query('UPDATE plans SET status = $1 WHERE id = $2', ['completed', planId]);
    } else if (anyFailed) {
      await pool.query('UPDATE plans SET status = $1 WHERE id = $2', ['failed', planId]);
    }
  }
}

export const planningService = new PlanningService();
