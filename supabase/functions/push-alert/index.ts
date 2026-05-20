import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2.39.3"
import webpush from "npm:web-push@3.6.7"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    webpush.setVapidDetails(
      'mailto:johnrodriguesdeveloper@gmail.com',
      Deno.env.get('VAPID_PUBLIC_KEY') ?? '',
      Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
    )

    const { data: subs, error } = await supabase.from('push_subscriptions').select('*')
    if (error) throw error

    let successCount = 0;

    for (const sub of subs) {
      const pushConfig = {
        endpoint: sub.endpoint,
        keys: { auth: sub.auth, p256dh: sub.p256dh }
      }

      const payload = JSON.stringify({
        title: 'O Backend Acordou! 🚀',
        body: 'Se você está vendo isso, nosso servidor e as chaves VAPID estão funcionando perfeitamente!',
        data: { url: '/' }
      })

      try {
        await webpush.sendNotification(pushConfig, payload)
        successCount++
      } catch (e) {
        console.error('Erro ao enviar para um dispositivo', e)
      }
    }

    return new Response(JSON.stringify({ message: `Sucesso! Disparado para ${successCount} aparelhos.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})