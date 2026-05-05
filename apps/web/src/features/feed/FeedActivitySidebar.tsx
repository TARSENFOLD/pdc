import { motion } from 'motion/react';
import { useReducedMotion } from 'motion/react';
import { Card } from '@/components/ui/Card';
import { Clock, Award, TrendingUp, Users } from 'lucide-react';

const ACTIVITIES = [
  { id: 1, user: 'Ana Silva', action: 'completou a simulação', target: 'Medicina', time: '2 min', icon: Award },
  { id: 2, user: 'Carlos M.', action: 'conquistou o badge', target: 'Explorador', time: '5 min', icon: TrendingUp },
  { id: 3, user: 'Maria J.', action: 'inscreveu-se no curso', target: 'Programação Web', time: '12 min', icon: Users },
  { id: 4, user: 'João P.', action: 'comentou em', target: 'Engenharia', time: '15 min', icon: Clock },
];

export function FeedActivitySidebar(): React.JSX.Element {
  const reduced = useReducedMotion();

  return (
    <div className="space-y-6 sticky top-6">
      {/* Activity Card */}
      <Card className="p-5 bg-white/80 backdrop-blur-sm border border-gray-200/60 shadow-sm rounded-2xl">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
            Atividade da comunidade
          </h3>
        </div>
        
        <div className="space-y-4">
          {ACTIVITIES.map((activity, idx) => (
            <motion.div
              key={activity.id}
              initial={reduced ? { opacity: 1 } : { opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.3 }}
              className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                <activity.icon size={14} className="text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 leading-tight">
                  <span className="font-semibold">{activity.user}</span>{' '}
                  <span className="text-gray-600">{activity.action}</span>{' '}
                  <span className="font-medium text-gray-700">{activity.target}</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
              </div>
            </motion.div>
          ))}
        </div>
        
        <button className="w-full mt-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 uppercase tracking-wider transition-colors">
          Ver mais →
        </button>
      </Card>

      {/* Trending Topics */}
      <Card className="p-5 bg-white/80 backdrop-blur-sm border border-gray-200/60 shadow-sm rounded-2xl">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">
          Tópicos em alta
        </h3>
        <div className="flex flex-wrap gap-2">
          {['#Medicina', '#Programação', '#Design', '#Engenharia', '#Psicologia'].map((tag) => (
            <span
              key={tag}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium rounded-full cursor-pointer transition-colors"
            >
              {tag}
            </span>
          ))}
        </div>
      </Card>

      {/* Suggested Connections */}
      <Card className="p-5 bg-white/80 backdrop-blur-sm border border-gray-200/60 shadow-sm rounded-2xl">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">
          Pessoas que talvez conheças
        </h3>
        <div className="space-y-3">
          {['Mentor TI', 'Instituto Superior', 'Empresa Parceira'].map((name, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-sm font-bold">
                {name.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-700">{name}</p>
                <p className="text-xs text-gray-500">Área relacionada</p>
              </div>
              <button className="text-xs font-semibold text-amber-600 hover:text-amber-700">
                Seguir
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
