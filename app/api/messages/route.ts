import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    // Verificar token de autorização
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Token de autorização necessário" }, { status: 401 })
    }

    const token = authHeader.substring(7)

    // Verificar token (versão simplificada)
    try {
      const parts = token.split(".")
      if (parts.length !== 3) {
        return NextResponse.json({ error: "Token inválido" }, { status: 401 })
      }

      const payload = JSON.parse(atob(parts[1]))
      if (!payload.userId || payload.exp < Math.floor(Date.now() / 1000)) {
        return NextResponse.json({ error: "Token expirado" }, { status: 401 })
      }
    } catch (error) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    // Por enquanto, retornar mensagens vazias
    return NextResponse.json({
      messages: [],
    })
  } catch (error) {
    console.error("❌ Erro geral:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar token de autorização
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Token de autorização necessário" }, { status: 401 })
    }

    const token = authHeader.substring(7)

    // Verificar token (versão simplificada)
    let userId
    try {
      const parts = token.split(".")
      if (parts.length !== 3) {
        return NextResponse.json({ error: "Token inválido" }, { status: 401 })
      }

      const payload = JSON.parse(atob(parts[1]))
      if (!payload.userId || payload.exp < Math.floor(Date.now() / 1000)) {
        return NextResponse.json({ error: "Token expirado" }, { status: 401 })
      }
      userId = payload.userId
    } catch (error) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const body = await request.json()
    const { content, recipientId } = body

    if (!content || !recipientId) {
      return NextResponse.json({ error: "Conteúdo e destinatário são obrigatórios" }, { status: 400 })
    }

    // Por enquanto, apenas retornar sucesso
    return NextResponse.json({
      message: "Mensagem enviada com sucesso",
      id: Date.now(),
      content,
      senderId: userId,
      recipientId,
      createdAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ Erro geral:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
