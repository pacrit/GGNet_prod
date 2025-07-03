import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Token de autorização necessário" }, { status: 401 });
  }
  const token = authHeader.substring(7);
  // Decodifique o token para pegar o userId (exemplo simplificado)
  const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
  const userId = payload.userId;

  const sql = neon(process.env.DATABASE_URL!);
  const result = await sql`
    SELECT * FROM valorant_accounts WHERE user_id = ${userId} LIMIT 1
  `;

  if (result.length > 0) {
    return NextResponse.json({ account: result[0] });
  } else {
    return NextResponse.json({ account: null });
  }
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Token de autorização necessário" }, { status: 401 });
  }
  const token = authHeader.substring(7);
  const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
  const userId = payload.userId;

  const { riotName, riotTag, riotRegion } = await request.json();
  if (!riotName || !riotTag) {
    return NextResponse.json({ error: "Nome e tag são obrigatórios" }, { status: 400 });
  }

  // Consulta a Riot API
  const apiKey = process.env.RIOT_API_KEY;
  const accountUrl = `https://${encodeURIComponent(riotRegion)}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(riotName)}/${encodeURIComponent(riotTag)}?api_key=${apiKey}`;

  const riotRes = await fetch(accountUrl);
  if (!riotRes.ok) {
    return NextResponse.json({ error: "Não foi possível encontrar a conta Riot" }, { status: 404 });
  }
  const riotData = await riotRes.json();
  const puuid = riotData.puuid;

  // Salva ou atualiza no banco
  const sql = neon(process.env.DATABASE_URL!);
  const result = await sql`
    INSERT INTO valorant_accounts (user_id, riot_name, riot_tag, puuid, region)
    VALUES (${userId}, ${riotName}, ${riotTag}, ${puuid}, ${riotRegion})
    ON CONFLICT (user_id) DO UPDATE
      SET riot_name = EXCLUDED.riot_name,
          riot_tag = EXCLUDED.riot_tag,
          puuid = EXCLUDED.puuid,
          last_sync = NOW()
    RETURNING *;
  `;

  return NextResponse.json({ account: result[0], success: true });
}