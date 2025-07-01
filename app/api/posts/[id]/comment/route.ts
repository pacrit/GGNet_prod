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
  const params = context.params
  try {
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

    // Parse do corpo da requisição
    const body = await request.json()
    const content = body.content?.trim()
    if (!content) {
      return NextResponse.json({ error: "Comentário não pode ser vazio" }, { status: 400 })
    }

    // Inserir comentário
    const result = await sql`
      INSERT INTO post_comments (post_id, user_id, content)
      VALUES (${postId}, ${userId}, ${content})
      RETURNING id, post_id, user_id, content, created_at
    `

    const comment = result[0]

    return NextResponse.json({
      success: true,
      comment,
    })
  } catch (error) {
    console.error("❌ Erro ao adicionar comentário:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}