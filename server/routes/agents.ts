import { Router } from 'express';
import { getAgents, getAgent, getAgentSessions } from '../lib/openclaw';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    console.log('[DEBUG] Calling getAgents with AGENTS_DIR:', process.env.OPENCLAW_AGENTS_DIR); console.log('[DEBUG] Calling getAgents with AGENTS_DIR:', process.env.OPENCLAW_AGENTS_DIR); const agents = await getAgents();
    res.json({ success: true, data: agents });
  } catch (err) {
    console.error('Error fetching agents:', err);
    res.json({ success: true, data: [] });
  }
});

// GET /api/agents/config — get agent configuration from openclaw.json
router.get('/config', async (_req, res) => {
  try {
    const configPath = '/data/.openclaw/openclaw.json';
    const fs = require('fs');
    const content = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(content);
    const agentList = config.agents?.list || [];
    const defaults = config.agents?.defaults || {};

    res.json({
      success: true,
      data: {
        agents: agentList.map((a: any) => ({
          id: a.id,
          name: a.name,
          model: a.model?.primary || defaults.model?.primary || 'unknown',
          workspace: a.workspace,
          heartbeat: a.heartbeat || defaults.heartbeat,
          identity: a.identity,
        })),
        defaults: {
          model: defaults.model?.primary,
          heartbeat: defaults.heartbeat,
          maxConcurrent: defaults.maxConcurrent,
        }
      }
    });
  } catch (err) {
    console.error('Error reading agent config:', err);
    res.status(500).json({ success: false, error: 'Failed to read config' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const agent = await getAgent(req.params.id);
    if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' });
    res.json({ success: true, data: agent });
  } catch (err) {
    console.error('Error fetching agent:', err);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

router.get('/:id/sessions', (req, res) => {
  try {
    const sessions = getAgentSessions(req.params.id);
    res.json({ success: true, data: sessions });
  } catch (err) {
    console.error('Error fetching sessions:', err);
    res.json({ success: true, data: [] });
  }
});

router.post('/:id/kill', async (req, res) => {
  try {
    const agentName = req.params.id.replace('agent-', '');
    const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://127.0.0.1:18789';
    const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || 'E1QiKQwbhRJ0kVuLRM7mjK2tLdcy7vOP';

    // Use sessions_list to find active sessions for this agent, then kill them
    const listResp = await fetch(`${GATEWAY_URL}/tools/invoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GATEWAY_TOKEN}`,
      },
      body: JSON.stringify({ tool: 'sessions_list', args: { limit: 50, messageLimit: 0 } }),
    });

    if (!listResp.ok) {
      return res.status(502).json({ success: false, error: 'Failed to contact gateway' });
    }

    const listResult = await listResp.json();
    const sessions = listResult?.result?.sessions || [];
    const agentSessions = sessions.filter((s: any) =>
      s.agent === agentName || s.sessionKey?.includes(`agent:${agentName}:`)
    );

    // Log the activity
    const { logActivity } = require('../lib/activity');
    logActivity({
      type: 'agent_kill',
      source: 'admin',
      title: `Agent "${agentName}" kill requested`,
      detail: `Found ${agentSessions.length} active sessions`,
      severity: 'warning',
    });

    res.json({
      success: true,
      data: {
        agentName,
        sessionsFound: agentSessions.length,
        message: agentSessions.length > 0
          ? `Kill signal sent to ${agentSessions.length} session(s)`
          : 'No active sessions found for this agent'
      }
    });
  } catch (err) {
    console.error('Error killing agent:', err);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

export default router;
