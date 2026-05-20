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

    const url = new URL(req.url)
    const notificationType = url.searchParams.get('type')

    let usersToNotify: { user_id: string; title: string; body: string }[] = []

    if (notificationType === 'dia20') {
      const { data: todosOsPerfis } = await supabase
        .from('profiles')
        .select('user_id, full_name')

      const { data: preencheram } = await supabase
        .from('availability_routine')
        .select('user_id')

      if (todosOsPerfis) {
        const idsPreenchidos = new Set(preencheram?.map(p => p.user_id) || [])

        const pendentes = todosOsPerfis.filter(p => !idsPreenchidos.has(p.user_id))

        usersToNotify = pendentes.map(p => ({
          user_id: p.user_id,
          title: '🗓️ Último Dia!',
          body: `Olá, ${p.full_name.split(' ')[0]}! Hoje é o último dia para preencher sua disponibilidade para o próximo mês. Não se esqueça!`
        }))
      }
    } 
  
    else if (notificationType === 'escala') {
      const hoje = new Date().toISOString().split('T')[0]
      
      const { data: escalados } = await supabase
        .from('escalas')
        .select('user_id, funcao, departments(name)')
        .eq('data_escala', hoje)

      if (escalados) {
        usersToNotify = escalados.map(e => ({
          user_id: e.user_id,
          title: '🏃‍♂️ Hoje tem Escala!',
          body: `Bom dia! Passando para lembrar que hoje você está escalado no ${(e.departments as any)?.name} como ${e.funcao}. Nos vemos lá!`
        }))
      }
    }

    if (usersToNotify.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhum voluntário para notificar hoje." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    let enviados = 0
    for (const item of usersToNotify) {
      const { data: tokens } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', item.user_id)

      if (tokens) {
        for (const token of tokens) {
          try {
            await webpush.sendNotification(
              { endpoint: token.endpoint, keys: { auth: token.auth, p256dh: token.p256dh } },
              JSON.stringify({ title: item.title, body: item.body, data: { url: '/' } })
            )
            enviados++
          } catch (e) {
            console.error('Token inválido, limpando...', e)
            await supabase.from('push_subscriptions').delete().eq('id', token.id)
          }
        }
      }
    }

    return new Response(JSON.stringify({ message: `Sucesso! ${enviados} notificações enviadas.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})