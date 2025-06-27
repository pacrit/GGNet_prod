import { type NextRequest, NextResponse } from "next/server"

const JWT_SECRET = process.env.JWT_SECRET || "ggnetworking-dev-secret-key-2024-change-in-production"

// Função para verificar token
function verifyToken(token: string) {
  try {
    if (!token) return null

    const parts = token.split(".")
    if (parts.length !== 3) return null

    const payload = JSON.parse(atob(parts[1]))

    if (!payload.userId || !payload.email || !payload.displayName) return null
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null

    const expectedSignature = btoa(`${parts[0]}.${parts[1]}.${JWT_SECRET}`).replace(/=/g, "")
    if (parts[2] !== expectedSignature) return null

    return payload
  } catch (error) {
    return null
  }
}

// Função para conectar ao banco
async function connectDatabase() {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL não encontrada")
    }

    const { neon } = await import("@neondatabase/serverless")
    return neon(process.env.DATABASE_URL)
  } catch (error) {
    throw new Error("Falha na conexão: " + (error instanceof Error ? error.message : String(error)))
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "")

    if (!token) {
      return NextResponse.json({ error: "Token de autorização necessário" }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const sql = await connectDatabase()

    const users = await sql`
      SELECT id, email, display_name, avatar_url, created_at
      FROM users 
      WHERE id != ${payload.userId}
      ORDER BY display_name
    `

    return NextResponse.json(users)
  } catch (error) {
    console.error("Erro ao buscar usuários:", error)
    return NextResponse.json(
      {
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
