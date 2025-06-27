import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 Iniciando processo de login...")

    // 1. Parse do JSON
    let body
    try {
      body = await request.json()
      console.log("✅ Parse do JSON funcionou")
    } catch (error) {
      console.error("❌ Erro no parse do JSON:", error)
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
    }

    // 2. Validações básicas
    const { email, password } = body

    if (!email || !password) {
      console.error("❌ Campos obrigatórios faltando")
      return NextResponse.json({ error: "Email e senha são obrigatórios" }, { status: 400 })
    }

    console.log("✅ Validações básicas passaram")

    // 3. Conectar ao banco
    let sql
    try {
      console.log("🔄 Conectando ao banco...")
      const { neon } = await import("@neondatabase/serverless")
      sql = neon(process.env.DATABASE_URL!)
      console.log("✅ Conexão com banco funcionou")
    } catch (error) {
      console.error("❌ Erro na conexão com banco:", error)
      return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
    }

    // 4. Buscar usuário
    let user
    try {
      console.log("🔄 Buscando usuário...")
      const users = await sql`
        SELECT id, email, password_hash, display_name FROM users WHERE email = ${email}
      `
      console.log("✅ Consulta executada, usuários encontrados:", users.length)

      if (users.length === 0) {
        console.log("❌ Usuário não encontrado")
        return NextResponse.json({ error: "Email ou senha incorretos" }, { status: 401 })
      }

      user = users[0]
    } catch (error) {
      console.error("❌ Erro ao buscar usuário:", error)
      return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
    }

    // 5. Verificar senha
    try {
      console.log("🔄 Verificando senha...")

      const JWT_SECRET = process.env.JWT_SECRET || "ggnetworking-dev-secret-key-2024-change-in-production"
      const encoder = new TextEncoder()
      const data = encoder.encode(password + JWT_SECRET + "salt")

      const hashBuffer = await crypto.subtle.digest("SHA-256", data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hashedInput = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")

      if (hashedInput !== user.password_hash) {
        console.log("❌ Senha incorreta")
        return NextResponse.json({ error: "Email ou senha incorretos" }, { status: 401 })
      }

      console.log("✅ Senha correta")
    } catch (error) {
      console.error("❌ Erro ao verificar senha:", error)
      return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
    }

    // 6. Gerar token JWT
    let token
    try {
      console.log("🔄 Gerando token...")

      const header = { alg: "HS256", typ: "JWT" }
      const now = Math.floor(Date.now() / 1000)
      const payload = {
        userId: user.id,
        email: user.email,
        displayName: user.display_name,
        iat: now,
        exp: now + 7 * 24 * 60 * 60, // 7 dias
      }

      const JWT_SECRET = process.env.JWT_SECRET || "ggnetworking-dev-secret-key-2024-change-in-production"
      const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, "")
      const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, "")
      const signature = btoa(`${encodedHeader}.${encodedPayload}.${JWT_SECRET}`).replace(/=/g, "")

      token = `${encodedHeader}.${encodedPayload}.${signature}`
      console.log("✅ Token gerado, tamanho:", token.length)
    } catch (error) {
      console.error("❌ Erro ao gerar token:", error)
      return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
    }

    console.log("🎉 Login realizado com sucesso!")

    return NextResponse.json({
      message: "Login realizado com sucesso",
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
      },
      token,
    })
  } catch (error) {
    console.error("❌ Erro geral no login:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
