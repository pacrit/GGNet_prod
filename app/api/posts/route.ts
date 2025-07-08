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

// GET - Buscar posts apenas de amigos
export async function GET(request: NextRequest) {
  try {
    console.log("🔄 Buscando posts de amigos...")

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

    // Buscar posts apenas de amigos (incluindo próprios posts)
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
      WHERE p.user_id = ${currentUserId} -- Próprios posts
         OR p.user_id IN (
           -- Posts de amigos aceitos
           SELECT user_id 
           FROM friends 
           WHERE friend_id = ${currentUserId} AND status = 'accepted'
           UNION
           SELECT friend_id 
           FROM friends 
           WHERE user_id = ${currentUserId} AND status = 'accepted'
         )
      GROUP BY p.id, p.content, p.image_url, p.user_id, p.created_at, u.display_name, u.avatar_url, ul.user_id
      ORDER BY p.created_at DESC
      LIMIT 50
    `

    // Buscar todos os comentários desses posts de uma vez
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

    console.log(`✅ Encontrados ${posts.length} posts de amigos`)

    // Montar resposta incluindo os comentários
    return NextResponse.json({
      success: true,
      posts: posts.map((post) => ({
        ...post,
        likes_count: Number.parseInt(post.likes_count.toString()),
        user_liked: post.user_liked,
        comments: commentsByPost[post.id] || [],
      })),
    })
  } catch (error) {
    console.error("❌ Erro ao buscar posts de amigos:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

// POST - Criar post (permanece igual)
export async function POST(request: NextRequest) {
  try {
    console.log("🔄 Criando novo post...")

    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Token não fornecido" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)

    if (!payload) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const { content, image_url } = await request.json()

    if ((!content || !content.trim()) && !image_url) {
      return NextResponse.json({ error: "Conteúdo é obrigatório" }, { status: 400 })
    }

    if (content.length > 500) {
      return NextResponse.json({ error: "Post muito longo (máximo 500 caracteres)" }, { status: 400 })
    }

    const userId = payload.userId

    // Criar o post
    const newPost = await sql`
      INSERT INTO posts (content, image_url, user_id, created_at)
      VALUES (${content.trim()}, ${image_url}, ${userId}, NOW())
      RETURNING id, content, user_id, created_at
    `

    // Buscar informações do usuário
    const user = await sql`
      SELECT display_name, avatar_url
      FROM users
      WHERE id = ${userId}
    `

    const postWithUser = {
      id: newPost[0].id,
      content: newPost[0].content,
      image_url: image_url || null,
      user_id: newPost[0].user_id,
      created_at: newPost[0].created_at,
      user_name: user[0].display_name,
      user_avatar: user[0].avatar_url,
      likes_count: 0,
      user_liked: false,
      comments: [], // Inicializar com array vazio
    }

    console.log("✅ Post criado com sucesso:", postWithUser.id)

    return NextResponse.json({
      success: true,
      post: postWithUser,
    })
  } catch (error) {
    console.error("❌ Erro ao criar post:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}