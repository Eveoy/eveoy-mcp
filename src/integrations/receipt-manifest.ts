/**
 * Action Risk Manifest (EP-ACTION-RISK-MANIFEST-v0.1) for the OPT-IN "Receipt
 * Required" gate in front of start_checkout. See src/integrations/receipt.ts.
 *
 * Embedded as a module (not read from disk) because the Worker/Durable Object
 * runtime has no filesystem. Serve a copy at /.well-known/agent-actions.json so
 * agents can discover what to bring; public/.well-known/agent-actions.json holds
 * the static copy.
 *
 * This manifest is INERT unless the maintainer opts in (see RECEIPT_REQUIRED env
 * in src/config.ts). With no opt-in, the gate never consults it and start_checkout
 * behaves exactly as before.
 */
export const RECEIPT_MANIFEST = {
  '@version': 'EP-ACTION-RISK-MANIFEST-v0.1',
  service: { name: 'eveoy-mcp', manifest_url: '/.well-known/agent-actions.json' },
  actions: [
    {
      id: 'mcp.start_checkout',
      description:
        'Creates a Stripe checkout session and a Zoho CRM deal for a paid pilot. ' +
        'Opt-in: when enabled, requires a named human\'s authorization receipt for this exact order.',
      match: { protocol: 'mcp', tool: 'start_checkout' },
      action_type: 'eveoy.checkout.create',
      risk: 'high',
      receipt_required: true,
      assurance_class: 'class_a',
      max_age_sec: 900,
      quorum: { required: false },
    },
  ],
} as const;
