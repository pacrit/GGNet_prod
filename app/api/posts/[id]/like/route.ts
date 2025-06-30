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

export async function POST(request: NextRequest, context: { params: { id: string } }) {
  const params = await context.params;
  try {
    console.log("🔄 Processando curtida/descurtida...")

    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Token não fornecido" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)

    if (!payload) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const postId = Number.parseInt(params.id)
    const userId = payload.userId

    if (isNaN(postId)) {
      return NextResponse.json({ error: "ID do post inválido" }, { status: 400 })
    }

    // Verificar se o post existe
    const post = await sql`
      SELECT id FROM posts WHERE id = ${postId}
    `

    if (post.length === 0) {
      return NextResponse.json({ error: "Post não encontrado" }, { status: 404 })
    }

    // Verificar se o usuário já curtiu
    const existingLike = await sql`
      SELECT id FROM post_likes 
      WHERE post_id = ${postId} AND user_id = ${userId}
    `

    let userLiked = false

    if (existingLike.length > 0) {
      // Remover curtida
      await sql`
        DELETE FROM post_likes 
        WHERE post_id = ${postId} AND user_id = ${userId}
      `
      console.log("👎 Curtida removida")
    } else {
      // Adicionar curtida
      await sql`
        INSERT INTO post_likes (post_id, user_id, created_at)
        VALUES (${postId}, ${userId}, NOW())
      `
      userLiked = true
      console.log("👍 Curtida adicionada")
    }

    // Contar total de curtidas
    const likesCount = await sql`
      SELECT COUNT(*) as count FROM post_likes WHERE post_id = ${postId}
    `

    const totalLikes = Number.parseInt(likesCount[0].count.toString())

    console.log(`✅ Post ${postId} agora tem ${totalLikes} curtidas`)

    return NextResponse.json({
      success: true,
      likes_count: totalLikes,
      user_liked: userLiked,
    })
  } catch (error) {
    console.error("❌ Erro ao processar curtida:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
