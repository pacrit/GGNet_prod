import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

// Função para verificar token JWT
function verifyToken(token: string) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]))
    return payload
  } catch (error) {
    return null
  }
}

// GET - Buscar posts de um usuário específico
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("🔄 Buscando posts do usuário:", params.id)

    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Token não fornecido" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)

    if (!payload) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const currentUserId = payload.userId
    const targetUserId = parseInt(params.id)

    // Verificar se o usuário alvo existe
    const targetUser = await sql`
      SELECT id, display_name FROM users WHERE id = ${targetUserId}
    `

    if (!targetUser.length) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    // Verificar se são amigos ou se é o próprio usuário
    const isSelfProfile = currentUserId === targetUserId
    
    let areFriends = false
    if (!isSelfProfile) {
      const friendshipCheck = await sql`
        SELECT 1 FROM friends 
        WHERE ((user_id = ${currentUserId} AND friend_id = ${targetUserId}) 
           OR (user_id = ${targetUserId} AND friend_id = ${currentUserId}))
        AND status = 'accepted'
        LIMIT 1
      `
      areFriends = friendshipCheck.length > 0
    }

    // Só mostrar posts se for amigo ou próprio perfil
    if (!isSelfProfile && !areFriends) {
      return NextResponse.json({ 
        success: true, 
        posts: [],
        message: "Você precisa ser amigo para ver os posts deste usuário"
      })
    }

    // Buscar posts do usuário
    const posts = await sql`
      SELECT 
        p.id,
        p.content,
        p.image_url,
        p.user_id,
        p.created_at,
        u.display_name as user_name,
        u.avatar_url as user_avatar,
        COUNT(l.id) as likes_count,
        CASE WHEN ul.user_id IS NOT NULL THEN true ELSE false END as user_liked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN post_likes l ON p.id = l.post_id
      LEFT JOIN post_likes ul ON p.id = ul.post_id AND ul.user_id = ${currentUserId}
      WHERE p.user_id = ${targetUserId}
      GROUP BY p.id, p.content, p.image_url, p.user_id, p.created_at, u.display_name, u.avatar_url, ul.user_id
      ORDER BY p.created_at DESC
      LIMIT 20
    `

    // Buscar comentários dos posts
    const postIds = posts.map((p) => p.id)
    let comments: any[] = []
    if (postIds.length > 0) {
      comments = await sql`
        SELECT 
          c.id,
          c.post_id,
          c.user_id,
          c.content,
          c.created_at,
          u.display_name as user_name,
          u.avatar_url as user_avatar
        FROM post_comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.post_id = ANY(${postIds})
        ORDER BY c.created_at ASC
      `
    }

    // Agrupar comentários por post_id
    const commentsByPost: Record<number, any[]> = {}
    for (const comment of comments) {
      if (!commentsByPost[comment.post_id]) commentsByPost[comment.post_id] = []
      commentsByPost[comment.post_id].push({
        id: comment.id,
        user_id: comment.user_id,
        user_name: comment.user_name,
        user_avatar: comment.user_avatar,
        content: comment.content,
        created_at: comment.created_at,
      })
    }

    console.log(`✅ Encontrados ${posts.length} posts do usuário ${targetUserId}`)

    return NextResponse.json({
      success: true,
      posts: posts.map((post) => ({
        ...post,
        likes_count: Number.parseInt(post.likes_count.toString()),
        user_liked: post.user_liked,
        comments: commentsByPost[post.id] || [],
      })),
      isSelfProfile,
      areFriends,
    })
  } catch (error) {
    console.error("❌ Erro ao buscar posts do usuário:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}