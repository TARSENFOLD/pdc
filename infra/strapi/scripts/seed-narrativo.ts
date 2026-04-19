import { createStrapi } from '@strapi/strapi';
// @ts-ignore: O script de Seed cruza workspaces e o tsx consegue interpretá-lo mas o tsc queixa-se de rootDir
import { personas } from '../../../apps/api/src/modules/vocacional/__fixtures__/personas.js';

// ─── 1. ENV GUARD (CONSTITUTION V2 ZERO MOCKS IN PROD) ──────────────
if (process.env.NODE_ENV === 'production' && !process.argv.includes('--force-seed')) {
  console.error('🚫 ERRO CRÍTICO: Execução do Seed bloqueada em ambiente de Produção.');
  console.error('Use a flag --force-seed se souber absolutamente o que está a fazer.');
  process.exit(1);
}

// ─── 2. UTILS & STRAPI BOOT ──────────────────────────────────────────
async function main() {
  console.log('🌱 Iniciando PDC Seed Narrativo (W1-T5) ...');
  const app = await createStrapi({ appDir: process.cwd() + '/dist' }).load();

  const findOrCreate = async (uid: string, filters: any, data: any) => {
    const existing = await app.documents(uid as any).findFirst({ filters });
    if (existing) return existing;
    return await app.documents(uid as any).create({ data, status: 'published' });
  };

  try {
    // ─── 3. ÁREAS VOCACIONAIS E INSTITUIÇÕES ────────────────────────
    const areas = ['Engenharia', 'Saúde', 'Gestão', 'Artes', 'Tecnologia', 'Ciências Sociais'];
    
    // ─── 3.1 SIMULAÇÕES (R2.T5) ──────────────────────────────────────
    console.log('🧪 Criando Simulações (Diversidade de Tipos)...');
    for (let i = 0; i < areas.length; i++) {
      const area = areas[i];
      const tipo = (i % 3) + 1; // Alternar entre Tipo 1, 2 e 3
      await findOrCreate('api::simulacao.simulacao', { slug: `sim-${area.toLowerCase().replace(' ', '-')}` }, {
        titulo: `Simulação Profissional: ${area}`,
        slug: `sim-${area.toLowerCase().replace(' ', '-')}`,
        descricao: `Teste as tuas habilidades práticas no domínio de ${area}. Fidelity Level ${tipo}.`,
        area: area.toUpperCase(),
        tipo,
        estado: 'published',
      });
    }

    const instNomes = [
      'Universidade Agostinho Neto (UAN)', 'ISPTEC', 'Universidade Católica de Angola (UCAN)',
      'Universidade Metodista de Angola', 'Instituto Superior Politécnico Tundavala',
      'Universidade Lusíada de Angola', 'ISPC', 'Universidade Independente',
      'Instituto Politécnico de Luanda', 'Academia de Artes Escénicas'
    ];

    console.log('🏢 Criando Instituições...');
    const instituicoes = [];
    for (const [index, nome] of instNomes.entries()) {
      const res = await findOrCreate('api::instituicao.instituicao', { nome }, {
        nome,
        sigla: nome.split(' ').map(p => p[0]).join('').substring(0, 4).toUpperCase(),
        descricao: `Instituição de Ensino de Referência - Sede ${index}`,
      });
      instituicoes.push(res);
    }

    // ─── 4. MENTORES (30 = 1 Elite por Área + Gerais) ───────────────
    console.log('🎓 Criando 30 Mentores de Autoridade...');
    const mentorProfiles = [];
    for (let i = 1; i <= 30; i++) {
      const area = areas[i % areas.length];
      const nome = `Mentor(a) ${area} #${i}`;
      
      const user = await findOrCreate('plugin::users-permissions.user', { email: `mentor${i}@pdc.ao` }, {
        username: `mentor${i}`,
        email: `mentor${i}@pdc.ao`,
        password: 'PdcSeed2026!',
        confirmed: true,
        blocked: false,
      });

      const perfil = await findOrCreate('api::perfil.perfil', { userId: user.documentId }, {
        nome,
        tipo: 'mentor',
        userId: user.documentId,
        headline: i <= 6 ? `Mentor(a) Elite e Global de ${area}` : `Especialista em ${area}`,
        areaFormacao: area,
        reputacao: i <= 6 ? 98 : 70 + (i % 20),
      });
      mentorProfiles.push(perfil);
    }

    // ─── 5. 100 ALUNOS BASEADOS EM PERSONAS/ARQUÉTIPOS (Wave 0) ─────
    console.log('🧑‍🎓 Criando 100 Alunos (Baseados nos Arquétipos W0-T5)...');
    
    // As fixtures "personas" já contém o core psicológico (Cirurgião, Hacker, Gestor, etc)
    const alunos = [];
    for (let i = 1; i <= 100; i++) {
      const archetype = personas[i % personas.length];
      const email = `aluno${i}@pdc.ao`;
      
      const user = await findOrCreate('plugin::users-permissions.user', { email }, {
        username: `aluno${i}`,
        email,
        password: 'PdcSeed2026!',
        confirmed: true,
        blocked: false,
      });

      const perfil = await findOrCreate('api::perfil.perfil', { userId: user.documentId }, {
        nome: `${archetype.nome} #${i}`,
        tipo: 'aluno',
        userId: user.documentId,
        areaInteresse: [archetype.area],
      });
      
      alunos.push({ perfil, archetype });
    }

    // ─── 6. BEHAVIOR PATTERNS (Cálculo Coerente e Denso) ────────────
    console.log('🧠 Injetando Matriz de Behavior Patterns (Telemetria Idempotente)...');
    for (const alunoData of alunos) {
      const { perfil, archetype } = alunoData;
      const domainId = archetype.area.toLowerCase().replace(' ', '-');

      // Coerência Matemática (W1-T5): Phi e Resiliência mapeados aos arquétipos originais das fixtures
      let cognitiveFluidity = 5.0;
      let focusStability = 5.0;
      let resilienceIndex = 5.0;

      if (archetype.arquétipo === 'O Cirurgião') {
        cognitiveFluidity = 9.5; focusStability = 9.8; resilienceIndex = 9.0;
      } else if (archetype.arquétipo === 'O Hacker Hesitante') {
        cognitiveFluidity = 8.5; focusStability = 6.0; resilienceIndex = 4.5;
      } else if (archetype.arquétipo === 'O Gestor Impulsivo') {
        cognitiveFluidity = 4.0; focusStability = 4.5; resilienceIndex = 8.5;
      } else if (archetype.arquétipo === 'Elite') {
        cognitiveFluidity = 9.9; focusStability = 9.9; resilienceIndex = 9.9;
      }

      await findOrCreate('api::behavior-pattern.behavior-pattern', { perfil: perfil.documentId, domainId }, {
        perfil: perfil.documentId,
        domainId,
        cognitiveFluidity,
        focusStability,
        resilienceIndex,
        successRate: cognitiveFluidity / 10,
        technicalScore: (cognitiveFluidity + focusStability) / 2,
        tinaSummary: {
          verdict: `Avaliador Tina: Arquétipo comportamental aproxima-se do perfil "${archetype.arquétipo}".`
        },
        lastUpdatedAt: new Date().toISOString(),
      });
    }

    console.log('✅ Seed Narrativo Concluído com Sucesso e Idempotência Garantida.');
  } catch (err) {
    console.error('❌ Falha Crítica no Seed:', err);
  } finally {
    process.exit(0);
  }
}

main().catch(console.error);
