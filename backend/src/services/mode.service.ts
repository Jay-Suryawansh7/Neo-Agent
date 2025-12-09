/**
 * Mode Service
 * State machine for Neo's operational modes
 */

import { NeoMode } from '../../../shared/types';
import { memoryService } from './memory.service';

class ModeService {
  /**
   * Determine mode from conversation context
   */
  async determineMode(sessionId: string, currentMessage: string): Promise<NeoMode> {
    const session = await memoryService.getSession(sessionId);
    if (!session) return NeoMode.VISITOR;

    const currentMode = session.currentMode;

    // Mode transition logic
    const message = currentMessage.toLowerCase();

    // Check for upgrade triggers
    if (this.indicatesJoinIntent(message)) {
      return this.upgradeMode(currentMode, NeoMode.APPLICANT);
    }

    if (this.indicatesExplorationIntent(message)) {
      return this.upgradeMode(currentMode, NeoMode.EXPLORER);
    }

    if (this.indicatesContributionIntent(message)) {
      return this.upgradeMode(currentMode, NeoMode.BUILDER);
    }

    // Default: maintain current mode
    return currentMode;
  }

  /**
   * Check mode access permissions
   */
  canAccess(mode: NeoMode, resource: string): boolean {
    const permissions: Record<NeoMode, Set<string>> = {
      [NeoMode.VISITOR]: new Set(['public', 'vision', 'mission']),
      [NeoMode.EXPLORER]: new Set(['public', 'vision', 'mission', 'departments', 'projects', 'academy']),
      [NeoMode.APPLICANT]: new Set(['public', 'vision', 'mission', 'departments', 'projects', 'academy', 'application']),
      [NeoMode.BUILDER]: new Set(['public', 'vision', 'mission', 'departments', 'projects', 'academy', 'application', 'contribution']),
      [NeoMode.OPERATOR]: new Set(['all']),
    };

    return permissions[mode]?.has(resource) || permissions[mode]?.has('all') || false;
  }

  /**
   * Filter response based on mode
   */
  filterResponse(mode: NeoMode, response: string, requestedInfo: string): string {
    // Check if requested information is accessible in this mode
    const categories = ['departments', 'projects', 'academy', 'application', 'contribution'];
    
    for (const category of categories) {
      if (requestedInfo.includes(category) && !this.canAccess(mode, category)) {
        return `I can provide information about ${category} at a higher access level. Would you like to explore CogneoVerse further?`;
      }
    }

    return response;
  }

  // Private helper methods

  private indicatesJoinIntent(message: string): boolean {
    const joinKeywords = [
      'join',
      'apply',
      'application',
      'how to join',
      'become a member',
      'get involved',
      'sign up',
      'onboarding',
    ];

    return joinKeywords.some(keyword => message.includes(keyword));
  }

  private indicatesExplorationIntent(message: string): boolean {
    const exploreKeywords = [
      'department',
      'project',
      'academy',
      'what do you do',
      'tell me more',
      'learn about',
      'explore',
    ];

    return exploreKeywords.some(keyword => message.includes(keyword));
  }

  private indicatesContributionIntent(message: string): boolean {
    const contributionKeywords = [
      'contribute',
      'build',
      'develop',
      'work on',
      'collaboration',
      'help with',
      'start working',
    ];

    return contributionKeywords.some(keyword => message.includes(keyword));
  }

  private upgradeMode(currentMode: NeoMode, targetMode: NeoMode): NeoMode {
    const modeHierarchy = [
      NeoMode.VISITOR,
      NeoMode.EXPLORER,
      NeoMode.APPLICANT,
      NeoMode.BUILDER,
      NeoMode.OPERATOR,
    ];

    const currentIndex = modeHierarchy.indexOf(currentMode);
    const targetIndex = modeHierarchy.indexOf(targetMode);

    // Only upgrade, never downgrade automatically
    return targetIndex > currentIndex ? targetMode : currentMode;
  }
}

export const modeService = new ModeService();
