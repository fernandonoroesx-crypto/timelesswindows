import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

  const authHeader = req.headers.get('Authorization')!
  const anonClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: { user }, error: authError } = await anonClient.auth.getUser()
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey)
  const { data: callerRole } = await adminClient
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (!callerRole || callerRole.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = req.method === 'POST' ? await req.json() : {}
    const action = body.action || 'list'

    if (action === 'list') {
      const { data: profiles } = await adminClient.from('profiles').select('*')
      const { data: roles } = await adminClient.from('user_roles').select('*')
      const { data: { users } } = await adminClient.auth.admin.listUsers()

      const result = (users || []).map((u: any) => {
        const profile = profiles?.find((p: any) => p.id === u.id)
        const role = roles?.find((r: any) => r.user_id === u.id)
        return {
          id: u.id,
          email: u.email,
          display_name: profile?.display_name || u.email,
          role: role?.role || null,
          created_at: u.created_at,
        }
      })

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'invite') {
      const { email, password, displayName, role } = body

      if (!email || !role || !password) {
        return new Response(JSON.stringify({ error: 'Email, password, and role are required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data: created, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name: displayName || email },
      })

      if (createError) {
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      await adminClient.from('profiles').insert({
        id: created.user.id,
        display_name: displayName || email,
      })

      await adminClient.from('user_roles').insert({
        user_id: created.user.id,
        role,
      })

      return new Response(JSON.stringify({ success: true, userId: created.user.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'update') {
      const { userId, role, displayName, newPassword } = body

      if (!userId) {
        return new Response(JSON.stringify({ error: 'userId is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (role) {
        const { data: existing } = await adminClient
          .from('user_roles')
          .select('id')
          .eq('user_id', userId)
          .single()

        if (existing) {
          await adminClient.from('user_roles').update({ role }).eq('user_id', userId)
        } else {
          await adminClient.from('user_roles').insert({ user_id: userId, role })
        }
      }

      if (displayName !== undefined) {
        await adminClient.from('profiles').update({ display_name: displayName }).eq('id', userId)
      }

      if (newPassword) {
        const { error: pwError } = await adminClient.auth.admin.updateUserById(userId, {
          password: newPassword,
        })
        if (pwError) {
          return new Response(JSON.stringify({ error: pwError.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
