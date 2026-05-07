const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
// Forçar leitura do .env da raiz do monorepo
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const TOKEN = process.env.STRAPI_API_TOKEN;

console.log(`🔍 Diagnóstico: STRAPI_URL=${STRAPI_URL}`);
console.log(`🔍 Diagnóstico: Token presente? ${TOKEN ? 'Sim (' + TOKEN.substring(0, 8) + '...)' : 'Não'}`);

if (!TOKEN) {
  console.error('❌ Erro Fatal: STRAPI_API_TOKEN não encontrado no ambiente.');
  process.exit(1);
}

const api = axios.create({
  baseURL: `${STRAPI_URL}/api`,
  headers: { 
    'Authorization': `Bearer ${TOKEN.trim()}`, 
    'Content-Type': 'application/json' 
  }
});

async function findOrCreate(path, filters, data) {
  try {
    const query = Object.keys(filters).map(k => `filters[${k}][$eq]=${filters[k]}`).join('&');
    const existing = await api.get(`${path}?${query}`);
    
    if (existing.data.data && existing.data.data.length > 0) {
       return existing.data.data[0];
    }
    
    const created = await api.post(path, { data });
    return created.data.data;
  } catch (err) {
    console.error(`[Seed Error] ${path}:`, err.response?.data || err.message);
    throw err;
  }
}

async function findOrCreateUser(email, nome) {
  try {
    const existing = await api.get(`/users?filters[email][$eq]=${email}`);
    if (existing.data && existing.data.length > 0) {
      return existing.data[0];
    }
    
    // Criar utilizador no Strapi com password padrão
    const res = await api.post('/users', {
      username: email,
      email,
      password: 'PdcPassword123!',
      confirmed: true,
      role: 1 // Public/Authenticated dependendo do setup
    });
    return res.data;
  } catch (err) {
    console.error(`[Seed Error] User ${email}:`, err.response?.data || err.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Injetando Ecossistema Monumental v5.2...');

  try {
    const areas = ['ENGENHARIA', 'SAUDE', 'TECNOLOGIA', 'GESTAO', 'ARTES', 'DIREITO'];

    // 1. Instituições
    console.log('🏛️ Povoando Instituições...');
    const instData = [
      { nome: 'Universidade Agostinho Neto', slug: 'uan', tipo: 'universidade', regiao: 'Luanda', natureza: 'publica' },
      { nome: 'ISPTEC', slug: 'isptec', tipo: 'instituto', regiao: 'Luanda', natureza: 'privada' },
      { nome: 'Colégio Elite Luanda', slug: 'colegio-elite', tipo: 'escola', regiao: 'Luanda', natureza: 'privada' }
    ];

    const instituicoes = [];
    for (const data of instData) {
      const res = await findOrCreate('/instituicoes', { slug: data.slug }, data);
      instituicoes.push(res);
    }

    // 2. Mentores
    console.log('👨‍🏫 Povoando Mentores...');
    const mentorIds = [];
    for (let i = 0; i < 5; i++) {
      const area = areas[i % areas.length];
      const email = `mentor_${area.toLowerCase()}@pdc.ao`;
      
      const user = await findOrCreateUser(email, `Mentor Expert ${area}`);
      if (!user) continue;

      const res = await findOrCreate('/perfis', { email }, {
        nome: `Mentor Expert ${area}`,
        email,
        tipo: 'mentor',
        userId: user.id.toString(),
        areaFormacao: area,
        headline: `Líder em ${area}`,
        reputacao: 95
      });
      mentorIds.push(res.id);
    }

    // 3. Simulações
    console.log('🧪 Criando Simulações...');
    for (const area of areas) {
      const slug = `sim-${area.toLowerCase()}`;
      await findOrCreate('/simulacoes', { slug }, {
        titulo: `Diagnóstico: ${area}`,
        slug,
        area: area,
        tipo: 2,
        estado: 'published'
      });
    }

    // 4. Personas (Músculo Behavioral)
    console.log('👥 Processando Personas...');
    for (let i = 0; i < 50; i++) {
      const area = areas[i % areas.length];
      const email = `aluno_${i}@pdc.ao`;
      
      const user = await findOrCreateUser(email, `Estudante Talento ${i}`);
      if (!user) continue;

      const aluno = await findOrCreate('/perfis', { email }, {
        nome: `Estudante Talento ${i}`,
        email,
        tipo: 'estudante',
        userId: user.id.toString(),
        areasInteresse: [area]
      });

      await findOrCreate('/behavior-patterns', { perfil: aluno.id, domainId: area }, {
        perfil: aluno.id,
        domainId: area,
        cognitiveFluidity: (Math.random() * 3 + 7).toFixed(1),
        resilienceIndex: (Math.random() * 4 + 6).toFixed(1),
        focusStability: (Math.random() * 2 + 8).toFixed(1),
        lastUpdatedAt: new Date().toISOString()
      });

      if (i % 10 === 0) console.log(`... ${i} personas integradas`);
    }

    console.log('✅ Ecossistema Monumental v5.2 ONLINE.');
    console.log('🔑 Credenciais padrão: email / PdcPassword123!');
  } catch (err) {
    console.error('❌ Falha na Sementeira:', err.message);
  }
}

main();
