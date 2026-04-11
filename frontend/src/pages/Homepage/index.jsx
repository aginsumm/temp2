import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import {
  MessageSquare,
  Network,
  Layers,
  ArrowRight,
  Sparkles,
  BookOpen,
  Users,
  Award,
  ChevronDown,
  Play,
  Star,
  Heart,
  Globe,
  Zap,
  Shield,
  TrendingUp,
  MousePointer2,
} from 'lucide-react';

const floatingElements = [
  { icon: '🎭', delay: 0, x: '10%', y: '20%' },
  { icon: '🎨', delay: 0.5, x: '85%', y: '15%' },
  { icon: '🏺', delay: 1, x: '75%', y: '70%' },
  { icon: '🎪', delay: 1.5, x: '15%', y: '75%' },
  { icon: '🎵', delay: 2, x: '50%', y: '10%' },
  { icon: '📖', delay: 2.5, x: '90%', y: '45%' },
];

const features = [
  {
    icon: MessageSquare,
    title: '智能问答',
    description: '基于大语言模型的智能对话系统，为您提供专业的非遗知识解答',
    link: '/chat',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
    bgGlow: 'rgba(245, 158, 11, 0.2)',
    stats: '10万+ 问答',
  },
  {
    icon: Network,
    title: '知识图谱',
    description: '可视化展示非遗知识网络，探索文化传承的脉络与关联',
    link: '/knowledge',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    bgGlow: 'rgba(59, 130, 246, 0.2)',
    stats: '5000+ 节点',
  },
  {
    icon: Layers,
    title: '元素提取',
    description: '智能识别和提取非遗元素，助力文化研究与传承',
    link: '/extract',
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
    bgGlow: 'rgba(139, 92, 246, 0.2)',
    stats: '100+ 类型',
  },
];

const stats = [
  { icon: BookOpen, value: '1000+', label: '非遗项目', trend: '+12%' },
  { icon: Users, value: '500+', label: '传承人', trend: '+8%' },
  { icon: Award, value: '100+', label: '技艺分类', trend: '+5%' },
  { icon: Globe, value: '50+', label: '文化区域', trend: '+3%' },
];

const highlights = [
  {
    icon: Zap,
    title: '极速响应',
    description: '毫秒级智能响应',
  },
  {
    icon: Shield,
    title: '权威数据',
    description: '官方认证信息源',
  },
  {
    icon: TrendingUp,
    title: '持续更新',
    description: '实时扩充知识库',
  },
];

const testimonials = [
  {
    content: '这个平台让我对非遗文化有了全新的认识，AI助手的解答非常专业！',
    author: '文化研究者',
    avatar: '👨‍🔬',
  },
  {
    content: '知识图谱的可视化效果太棒了，可以清晰地看到文化传承的脉络。',
    author: '高校教师',
    avatar: '👩‍🏫',
  },
  {
    content: '作为一个非遗爱好者，这个平台满足了我对传统文化的所有好奇心。',
    author: '文化爱好者',
    avatar: '🎨',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 100, damping: 15 },
  },
};

export default function Homepage() {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="min-h-[calc(100vh-64px)] overflow-hidden"
      style={{ background: 'var(--color-background)' }}
    >
      <section className="relative min-h-[90vh] flex items-center justify-center py-20 px-4 overflow-hidden">
        <div className="absolute inset-0">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl"
            style={{ background: 'var(--gradient-primary)', opacity: 0.3 }}
          />
          <motion.div
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 2,
            }}
            className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl"
            style={{ background: 'var(--gradient-secondary)', opacity: 0.3 }}
          />
          <motion.div
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 4,
            }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl"
            style={{ background: 'var(--gradient-accent)', opacity: 0.2 }}
          />
        </div>

        {floatingElements.map((el, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: [0.4, 0.7, 0.4],
              scale: [1, 1.2, 1],
              y: [0, -20, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: el.delay,
            }}
            className="absolute text-4xl pointer-events-none"
            style={{ left: el.x, top: el.y }}
          >
            {el.icon}
          </motion.div>
        ))}

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10 max-w-5xl mx-auto text-center"
        >
          <motion.div variants={itemVariants} className="mb-8">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: 'spring',
                delay: 0.3,
                stiffness: 200,
                damping: 15,
              }}
              className="relative inline-block mb-6"
            >
              <div
                className="absolute inset-0 rounded-3xl blur-2xl opacity-50"
                style={{ background: 'var(--gradient-primary)' }}
              />
              <div
                className="relative w-24 h-24 rounded-3xl flex items-center justify-center shadow-2xl"
                style={{
                  background: 'var(--gradient-primary)',
                  boxShadow: '0 20px 60px -15px var(--color-primary)',
                }}
              >
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Sparkles size={44} style={{ color: 'var(--color-text-inverse)' }} />
                </motion.div>
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full mb-8 shadow-lg"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            >
              <Star size={16} style={{ color: 'var(--color-primary)' }} fill="currentColor" />
            </motion.div>
            <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
              非遗文化数字传承平台
            </span>
            <span
              className="px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{
                background: 'var(--gradient-primary)',
                color: 'var(--color-text-inverse)',
              }}
            >
              v2.0
            </span>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight"
          >
            <span style={{ color: 'var(--color-text-primary)' }}>非遗数字生命</span>
            <br />
            <motion.span
              style={{
                background: 'var(--gradient-primary)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
              animate={{
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
              }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            >
              互动引擎
            </motion.span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            融合
            <span className="font-semibold" style={{ color: 'var(--color-primary)' }}>
              人工智能
            </span>
            与
            <span className="font-semibold" style={{ color: 'var(--color-secondary)' }}>
              传统文化
            </span>
            ，打造沉浸式的非遗知识探索体验，
            <br className="hidden md:block" />
            让千年技艺在数字时代焕发新生
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
          >
            <Link to="/chat" className="group">
              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-lg shadow-xl"
                style={{
                  background: 'var(--gradient-primary)',
                  color: 'var(--color-text-inverse)',
                  boxShadow: '0 10px 40px -10px var(--color-primary)',
                }}
              >
                <Play size={20} fill="currentColor" />
                开始探索
                <motion.div
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <ArrowRight size={20} />
                </motion.div>
              </motion.div>
            </Link>

            <Link to="/knowledge" className="group">
              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-lg"
                style={{
                  background: 'var(--color-surface)',
                  color: 'var(--color-text-primary)',
                  border: '2px solid var(--color-border)',
                }}
              >
                <Network size={20} />
                浏览图谱
              </motion.div>
            </Link>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="flex items-center justify-center gap-6 flex-wrap"
          >
            {highlights.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + index * 0.1 }}
                className="flex items-center gap-2"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{
                    background: 'var(--color-primary-light)',
                  }}
                >
                  <item.icon size={16} style={{ color: 'var(--color-primary)' }} />
                </div>
                <div className="text-left">
                  <div
                    className="text-sm font-medium"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {item.title}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {item.description}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="flex flex-col items-center gap-2 cursor-pointer"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <span className="text-xs">向下滚动</span>
            <ChevronDown size={20} />
          </motion.div>
        </motion.div>
      </section>

      <section className="py-20 px-4 relative">
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, transparent 0%, var(--color-surface) 50%, transparent 100%)',
          }}
        />

        <div className="relative max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 shadow-lg"
              style={{
                background: 'var(--gradient-primary)',
              }}
            >
              <Layers size={28} style={{ color: 'var(--color-text-inverse)' }} />
            </motion.div>
            <h2 className="text-4xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              核心功能
            </h2>
            <p
              className="text-lg max-w-xl mx-auto"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              三大核心模块，全方位探索非遗文化
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
              >
                <Link to={feature.link} className="block h-full group">
                  <motion.div
                    whileHover={{ y: -8, scale: 1.02 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                    className="h-full rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500"
                    style={{
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <div
                      className="relative h-40 flex items-center justify-center overflow-hidden"
                      style={{
                        background: feature.gradient,
                      }}
                    >
                      <div
                        className="absolute inset-0 opacity-30"
                        style={{
                          background:
                            'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.3) 0%, transparent 60%)',
                        }}
                      />
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                        className="relative w-20 h-20 rounded-2xl flex items-center justify-center shadow-xl"
                        style={{
                          background: 'rgba(255,255,255,0.2)',
                          backdropFilter: 'blur(10px)',
                        }}
                      >
                        <feature.icon size={36} style={{ color: 'white' }} />
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileHover={{ opacity: 1, x: 0 }}
                        className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-semibold"
                        style={{
                          background: 'rgba(255,255,255,0.2)',
                          color: 'white',
                          backdropFilter: 'blur(10px)',
                        }}
                      >
                        {feature.stats}
                      </motion.div>
                    </div>

                    <div className="p-6">
                      <h3
                        className="text-xl font-bold mb-3 group-hover:text-primary transition-colors"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {feature.title}
                      </h3>
                      <p
                        className="text-sm leading-relaxed mb-4"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {feature.description}
                      </p>
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        whileHover={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2 text-sm font-medium"
                        style={{ color: 'var(--color-primary)' }}
                      >
                        <span>立即体验</span>
                        <motion.div
                          animate={{ x: [0, 4, 0] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        >
                          <ArrowRight size={16} />
                        </motion.div>
                      </motion.div>
                    </div>
                  </motion.div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0">
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full"
            style={{
              border: '1px solid var(--color-border)',
              opacity: 0.3,
            }}
          />
          <motion.div
            animate={{ rotate: [360, 0] }}
            transition={{ duration: 45, repeat: Infinity, ease: 'linear' }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
            style={{
              border: '1px solid var(--color-border)',
              opacity: 0.3,
            }}
          />
        </div>

        <div className="relative max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              平台数据
            </h2>
            <p className="text-lg" style={{ color: 'var(--color-text-secondary)' }}>
              持续增长的文化资源库
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5, scale: 1.05 }}
                className="relative p-6 rounded-2xl text-center shadow-lg"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <motion.div
                  whileHover={{ rotate: [0, -10, 10, 0] }}
                  transition={{ duration: 0.5 }}
                  className="w-14 h-14 mx-auto mb-4 rounded-xl flex items-center justify-center shadow-md"
                  style={{
                    background: 'var(--gradient-primary)',
                  }}
                >
                  <stat.icon size={24} style={{ color: 'var(--color-text-inverse)' }} />
                </motion.div>
                <div
                  className="text-3xl font-bold mb-1"
                  style={{
                    background: 'var(--gradient-primary)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {stat.value}
                </div>
                <div className="text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  {stat.label}
                </div>
                <div
                  className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                  style={{
                    background: 'rgba(34, 197, 94, 0.1)',
                    color: 'var(--color-success)',
                  }}
                >
                  <TrendingUp size={10} />
                  {stat.trend}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              用户评价
            </h2>
            <p style={{ color: 'var(--color-text-secondary)' }}>来自各领域用户的真实反馈</p>
          </motion.div>

          <div className="relative h-48">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTestimonial}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div
                  className="max-w-2xl text-center p-8 rounded-3xl shadow-xl"
                  style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div className="text-4xl mb-4">{testimonials[currentTestimonial].avatar}</div>
                  <p className="text-lg mb-4 italic" style={{ color: 'var(--color-text-primary)' }}>
                    &ldquo;{testimonials[currentTestimonial].content}&rdquo;
                  </p>
                  <div
                    className="flex items-center justify-center gap-1"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    <Heart
                      size={14}
                      fill="var(--color-error)"
                      style={{ color: 'var(--color-error)' }}
                    />
                    <span className="text-sm font-medium">
                      {testimonials[currentTestimonial].author}
                    </span>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex justify-center gap-2 mt-6">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentTestimonial(index)}
                className="w-2 h-2 rounded-full transition-all"
                style={{
                  background:
                    index === currentTestimonial ? 'var(--color-primary)' : 'var(--color-border)',
                  transform: index === currentTestimonial ? 'scale(1.5)' : 'scale(1)',
                }}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: 'var(--gradient-primary)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.1) 0%, transparent 60%)',
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative max-w-4xl mx-auto text-center"
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="mb-8"
          >
            <MousePointer2 size={48} style={{ color: 'rgba(255,255,255,0.8)' }} />
          </motion.div>

          <h2 className="text-4xl font-bold text-white mb-4">开始您的非遗探索之旅</h2>
          <p className="text-white/80 mb-10 text-lg max-w-xl mx-auto">
            与AI助手对话，深入了解非遗文化的魅力，探索千年传承的智慧结晶
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/chat">
              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-3 px-10 py-5 rounded-2xl font-semibold text-lg shadow-2xl"
                style={{
                  background: 'white',
                  color: 'var(--color-primary)',
                }}
              >
                <Sparkles size={22} />
                立即开始
                <motion.div
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <ArrowRight size={22} />
                </motion.div>
              </motion.div>
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
