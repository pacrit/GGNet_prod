import { type NextRequest, NextResponse } from "next/server"
import { sql } from "../../lib/db"
import { verifyToken } from "../../lib/auth"

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    const { searchParams } = new URL(request.url)
    const recipientId = searchParams.get("recipientId")

    if (!token) {
      return NextResponse.json({ error: "Token de autorização necessário" }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    if (!recipientId) {
      return NextResponse.json({ error: "ID do destinatário é obrigatório" }, { status: 400 })
    }

    // Buscar ou criar chat
    const chats = await sql`
      SELECT id FROM chats 
      WHERE (participant_1_id = ${payload.userId} AND participant_2_id = ${recipientId})
         OR (participant_1_id = ${recipientId} AND participant_2_id = ${payload.userId})
    `

    let chatId: number

    if (chats.length === 0) {
      // Criar novo chat
      const newChats = await sql`
        INSERT INTO chats (participant_1_id, participant_2_id)
        VALUES (${Math.min(payload.userId, Number.parseInt(recipientId))}, ${Math.max(payload.userId, Number.parseInt(recipientId))})
        RETURNING id
      `
      chatId = newChats[0].id
    } else {
      chatId = chats[0].id
    }

    // Buscar mensagens do chat
    const messages = await sql`
      SELECT m.*, u.display_name as sender_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.chat_id = ${chatId}
      ORDER BY m.created_at ASC
    `

    return NextResponse.json(messages)
  } catch (error) {
    console.error("Erro ao buscar mensagens:", error)
    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        details:
          process.env.NODE_ENV === "development" ? (error instanceof Error ? error.message : String(error)) : undefined,
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    const { recipientId, content } = await request.json()

    if (!token) {
      return NextResponse.json({ error: "Token de autorização necessário" }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    if (!recipientId || !content?.trim()) {
      return NextResponse.json({ error: "Destinatário e conteúdo são obrigatórios" }, { status: 400 })
    }

    // Buscar ou criar chat
    const chats = await sql`
      SELECT id FROM chats 
      WHERE (participant_1_id = ${payload.userId} AND participant_2_id = ${recipientId})
         OR (participant_1_id = ${recipientId} AND participant_2_id = ${payload.userId})
    `

    let chatId: number

    if (chats.length === 0) {
      // Criar novo chat
      const newChats = await sql`
        INSERT INTO chats (participant_1_id, participant_2_id)
        VALUES (${Math.min(payload.userId, Number.parseInt(recipientId))}, ${Math.max(payload.userId, Number.parseInt(recipientId))})
        RETURNING id
      `
      chatId = newChats[0].id
    } else {
      chatId = chats[0].id
    }

    // Inserir mensagem
    const newMessages = await sql`
      INSERT INTO messages (chat_id, sender_id, content)
      VALUES (${chatId}, ${payload.userId}, ${content.trim()})
      RETURNING id, chat_id, sender_id, content, created_at
    `

    const message = newMessages[0]

    return NextResponse.json({
      ...message,
      sender_name: payload.displayName,
    })
  } catch (error) {
    console.error("Erro ao enviar mensagem:", error)
    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        details:
          process.env.NODE_ENV === "development" ? (error instanceof Error ? error.message : String(error)) : undefined,
      },
      { status: 500 },
    )
  }
}
