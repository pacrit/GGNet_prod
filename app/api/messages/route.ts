import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

// Função para verificar token JWT
function verifyToken(token: string) {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return null

    const payload = JSON.parse(atob(parts[1]))
    if (payload.exp < Math.floor(Date.now() / 1000)) return null

    return payload
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    if (!token) {
      return NextResponse.json({ error: "Token necessário" }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const recipientId = searchParams.get("recipientId")

    if (!recipientId) {
      return NextResponse.json({ error: "ID do destinatário necessário" }, { status: 400 })
    }

    // Buscar ou criar chat
    const chat = await sql`
      SELECT id FROM chats 
      WHERE (participant_1_id = ${payload.userId} AND participant_2_id = ${recipientId})
         OR (participant_1_id = ${recipientId} AND participant_2_id = ${payload.userId})
    `

    let chatId: number

    if (chat.length === 0) {
      // Criar novo chat
      const newChat = await sql`
        INSERT INTO chats (participant_1_id, participant_2_id)
        VALUES (${Math.min(payload.userId, Number.parseInt(recipientId))}, ${Math.max(payload.userId, Number.parseInt(recipientId))})
        RETURNING id
      `
      chatId = newChat[0].id
    } else {
      chatId = chat[0].id
    }

    // Buscar mensagens do chat
    const messages = await sql`
      SELECT 
        m.id,
        m.chat_id,
        m.sender_id,
        m.content,
        m.created_at,
        u.display_name as sender_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.chat_id = ${chatId}
      ORDER BY m.created_at ASC
    `

    return NextResponse.json({ messages })
  } catch (error) {
    console.error("Erro ao buscar mensagens:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    if (!token) {
      return NextResponse.json({ error: "Token necessário" }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const { recipientId, content } = await request.json()

    if (!recipientId || !content?.trim()) {
      return NextResponse.json({ error: "Destinatário e conteúdo são obrigatórios" }, { status: 400 })
    }

    // Buscar ou criar chat
    const chat = await sql`
      SELECT id FROM chats 
      WHERE (participant_1_id = ${payload.userId} AND participant_2_id = ${recipientId})
         OR (participant_1_id = ${recipientId} AND participant_2_id = ${payload.userId})
    `

    let chatId: number

    if (chat.length === 0) {
      // Criar novo chat
      const newChat = await sql`
        INSERT INTO chats (participant_1_id, participant_2_id)
        VALUES (${Math.min(payload.userId, Number.parseInt(recipientId))}, ${Math.max(payload.userId, Number.parseInt(recipientId))})
        RETURNING id
      `
      chatId = newChat[0].id
    } else {
      chatId = chat[0].id
    }

    // Inserir mensagem
    const newMessage = await sql`
      INSERT INTO messages (chat_id, sender_id, content)
      VALUES (${chatId}, ${payload.userId}, ${content.trim()})
      RETURNING id, chat_id, sender_id, content, created_at
    `

    return NextResponse.json({
      ...newMessage[0],
      sender_name: payload.displayName,
    })
  } catch (error) {
    console.error("Erro ao enviar mensagem:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
