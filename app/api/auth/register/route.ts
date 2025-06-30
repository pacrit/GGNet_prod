import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 Iniciando processo de cadastro...")

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
    const { email, password, displayName } = body

    if (!email || !password || !displayName) {
      console.error("❌ Campos obrigatórios faltando")
      return NextResponse.json({ error: "Email, senha e nome são obrigatórios" }, { status: 400 })
    }

    if (password.length < 6) {
      console.error("❌ Senha muito curta")
      return NextResponse.json({ error: "Senha deve ter pelo menos 6 caracteres" }, { status: 400 })
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

    // 4. Verificar se usuário já existe
    try {
      console.log("🔄 Verificando se usuário existe...")
      const existingUsers = await sql`
        SELECT id FROM users WHERE email = ${email}
      `
      console.log("✅ Consulta executada, usuários encontrados:", existingUsers.length)

      if (existingUsers.length > 0) {
        console.log("❌ Usuário já existe")
        return NextResponse.json({ error: "Email já cadastrado" }, { status: 400 })
      }
    } catch (error) {
      console.error("❌ Erro ao verificar usuário existente:", error)
      return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
    }

    // 5. Hash da senha
    let hashedPassword
    try {
      console.log("🔄 Fazendo hash da senha...")

      const JWT_SECRET = process.env.JWT_SECRET 
      const encoder = new TextEncoder()
      const data = encoder.encode(password + JWT_SECRET + "salt")

      const hashBuffer = await crypto.subtle.digest("SHA-256", data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      hashedPassword = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")

      console.log("✅ Hash criado, tamanho:", hashedPassword.length)
    } catch (error) {
      console.error("❌ Erro ao fazer hash:", error)
      return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
    }

    // 6. Criar usuário
    let newUser
    try {
      console.log("🔄 Criando usuário no banco...")
      const result = await sql`
        INSERT INTO users (email, password_hash, display_name, created_at, updated_at)
        VALUES (${email}, ${hashedPassword}, ${displayName}, NOW(), NOW())
        RETURNING id, email, display_name, created_at
      `
      newUser = result[0]
      console.log("✅ Usuário criado:", newUser.id)
    } catch (error) {
      console.error("❌ Erro ao criar usuário:", error)
      return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
    }

    // 7. Gerar token JWT
    let token
    try {
      console.log("🔄 Gerando token...")

      const header = { alg: "HS256", typ: "JWT" }
      const now = Math.floor(Date.now() / 1000)
      const payload = {
        userId: newUser.id,
        email: newUser.email,
        displayName: newUser.display_name,
        iat: now,
        exp: now + 7 * 24 * 60 * 60, // 7 dias
      }

      const JWT_SECRET = process.env.JWT_SECRET 
      const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, "")
      const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, "")
      const signature = btoa(`${encodedHeader}.${encodedPayload}.${JWT_SECRET}`).replace(/=/g, "")

      token = `${encodedHeader}.${encodedPayload}.${signature}`
      console.log("✅ Token gerado, tamanho:", token.length)
    } catch (error) {
      console.error("❌ Erro ao gerar token:", error)
      return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
    }

    console.log("🎉 Cadastro realizado com sucesso!")

    return NextResponse.json({
      message: "Usuário cadastrado com sucesso",
      user: {
        id: newUser.id,
        email: newUser.email,
        displayName: newUser.display_name,
      },
      token,
    })
  } catch (error) {
    console.error("❌ Erro geral no cadastro:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
