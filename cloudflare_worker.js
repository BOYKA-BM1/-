// ════════════════════════════════════════════════════════════════
// Cloudflare Worker — نور القرآن API Proxy
// انشره على: https://workers.cloudflare.com (مجاني 100K req/day)
// ════════════════════════════════════════════════════════════════
// 
// طريقة النشر:
// 1. اذهب لـ https://workers.cloudflare.com
// 2. أنشئ Worker جديد
// 3. الصق هذا الكود
// 4. في Settings → Variables → أضف:
//    ANTHROPIC_API_KEY = sk-ant-xxxxxxxx (مفتاحك)
// 5. انشر واحفظ الـ URL (مثلاً: noor-quran.your-name.workers.dev)
// ════════════════════════════════════════════════════════════════

export default {
  async fetch(request, env) {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const body = await request.json();
      
      // التحقق من البيانات
      if (!body.messages || !Array.isArray(body.messages)) {
        return new Response(JSON.stringify({ error: 'Invalid request' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // حد أقصى لطول الرسائل
      const messages = body.messages.slice(-12).map(m => ({
        role: m.role,
        content: String(m.content).slice(0, 8000)
      }));

      // إرسال لـ Claude
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: body.model || 'claude-sonnet-4-6',
          max_tokens: Math.min(body.max_tokens || 2000, 4000),
          system: body.system || '',
          messages,
        }),
      });

      const data = await response.json();
      
      return new Response(JSON.stringify(data), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};
