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
  const anonKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!

  // Verify caller is authenticated
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

  // Check caller is admin
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
    if (req.method === 'GET') {
      // List all users with profiles and roles
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

    if (req.method === 'POST') {
      const { email, displayName, role } = await req.json()

      if (!email || !role) {
        return new Response(JSON.stringify({ error: 'Email and role are required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Invite user by email
      const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
        data: { display_name: displayName || email },
      })

      if (inviteError) {
        return new Response(JSON.stringify({ error: inviteError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Create profile and role
      await adminClient.from('profiles').insert({
        id: invited.user.id,
        display_name: displayName || email,
      })

      await adminClient.from('user_roles').insert({
        user_id: invited.user.id,
        role,
      })

      return new Response(JSON.stringify({ success: true, userId: invited.user.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (req.method === 'PATCH') {
      const { userId, role, displayName, newPassword } = await req.json()

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

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
