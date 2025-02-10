import { useEffect, useState, FC } from 'react';
import { Github, Linkedin, Mail, ExternalLink, Code2, User2 } from 'lucide-react';
import { supabase } from './lib/supabase';

type Project = {
  id: string;
  title: string;
  description: string;
  image: string;
  tags: string[];
  link: string;
  category: 'web' | 'mobile' | 'desktop' | 'outros';
};

type Skill = {
  id: string;
  name: string;
  icon?: string;
};

// Adicione esta interface antes do componente App
interface SectionVisibility {
  sobre?: boolean;
  projetos?: boolean;
  habilidades?: boolean;
  contato?: boolean;
}

// Função auxiliar para obter o ícone correto baseado no nome da skill
const getSkillIcon = (skillName: string) => {
  const normalizedName = skillName.toLowerCase();
  
  const iconMap: { [key: string]: string } = {
    react: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg',
    javascript: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg',
    typescript: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg',
    python: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg',
    java: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/java/java-original.svg',
    nodejs: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg',
    html5: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg',
    css3: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-original.svg',
    tailwindcss: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tailwindcss/tailwindcss-plain.svg',
    postgresql: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg',
    mongodb: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg',
    git: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/git/git-original.svg',
    docker: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg',
    // Adicione mais ícones conforme necessário
  };

  return iconMap[normalizedName] || 'https://via.placeholder.com/40';
};

const App: FC = () => {
  const [isVisible, setIsVisible] = useState<SectionVisibility>({
    sobre: true,
    projetos: true,
    habilidades: true,
    contato: true
  });
  const [projects, setProjects] = useState<Project[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');

  const categories = [
    { id: 'todos', label: 'Todos' },
    { id: 'web', label: 'Web' },
    { id: 'mobile', label: 'Mobile' },
    { id: 'desktop', label: 'Desktop' },
    { id: 'outros', label: 'Outros' }
  ];

  const filteredProjects = selectedCategory === 'todos' 
    ? projects 
    : projects.filter(project => project.category === selectedCategory);

  useEffect(() => {
    fetchData();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsVisible(prev => ({
            ...prev,
            [entry.target.id]: entry.isIntersecting
          }));
        });
      },
      { 
        threshold: 0.1,
        rootMargin: '0px 0px -10% 0px'
      }
    );

    const sections = document.querySelectorAll('section[id]');
    sections.forEach((section) => {
      observer.observe(section);
    });

    return () => {
      sections.forEach((section) => {
        observer.unobserve(section);
      });
    };
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*');

      if (projectsError) {
        console.error('Erro ao buscar projetos:', projectsError);
        throw projectsError;
      }

      console.log('Projetos carregados:', projectsData);
      setProjects(projectsData || []);

      // Fetch skills
      const { data: skillsData, error: skillsError } = await supabase
        .from('skills')
        .select('*');

      if (skillsError) {
        console.error('Erro ao buscar habilidades:', skillsError);
        throw skillsError;
      }

      setSkills(skillsData || []);
    } catch (error) {
      console.error('Erro:', error);
      setError('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl text-gray-600">Carregando...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl text-red-600">{error}</div>
      </div>
    );
  }

  const sectionBaseClasses = "transition-all duration-700 ease-out transform";
  const sectionVisibleClasses = "opacity-100 translate-y-0";
  const sectionHiddenClasses = "opacity-0 translate-y-10";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 1. Header/Hero Section - Primeira impressão e chamada para ação */}
      <header className="min-h-screen relative overflow-hidden bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900">
        {/* Background Animation */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(45deg,#0f172a_25%,transparent_25%,transparent_75%,#0f172a_75%,#0f172a),linear-gradient(45deg,#0f172a_25%,transparent_25%,transparent_75%,#0f172a_75%,#0f172a)] bg-[length:60px_60px] opacity-20 animate-pulse"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-900/30 to-blue-950/80"></div>
        </div>

        {/* Animated Shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full animate-spin-slow">
            <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>
          </div>
          <div className="absolute -bottom-1/2 -right-1/2 w-full h-full animate-spin-slow-reverse">
            <div className="absolute bottom-1/2 right-1/2 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl transform translate-x-1/2 translate-y-1/2"></div>
          </div>
        </div>

        {/* Navbar */}
        <nav className="fixed top-0 left-0 right-0 bg-white/5 backdrop-blur-lg border-b border-white/10 z-50">
          <div className="container mx-auto px-6 py-4">
            <div className="flex justify-between items-center">
              <a href="#" className="text-2xl font-bold text-white hover:text-blue-300 transition-colors">
                Portfólio
              </a>
              <div className="hidden md:flex space-x-8">
                {['sobre', 'projetos', 'habilidades', 'contato'].map((item) => (
                  <a
                    key={item}
                    href={`#${item}`}
                    className="text-white/80 hover:text-white transition-colors relative group py-2"
                  >
                    <span className="capitalize">{item}</span>
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-400 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="relative container mx-auto px-6 pt-32 pb-20 min-h-screen flex items-center">
          <div className="max-w-4xl relative z-10">
            <div className="mb-8 animate-fade-in-up opacity-0" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
              <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
                Olá, eu sou o{' '}
                <span className="relative">
                  <span className="relative z-10 bg-gradient-to-r from-blue-400 to-indigo-400 text-transparent bg-clip-text">
                    Desenvolvedor
                  </span>
                  <span className="absolute -bottom-2 left-0 w-full h-3 bg-blue-500/30 rounded-full blur-sm"></span>
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-blue-100/90 max-w-2xl leading-relaxed">
                Desenvolvedor Full Stack apaixonado por criar soluções inovadoras e experiências digitais incríveis.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 animate-fade-in-up opacity-0" style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}>
              <a
                href="#contato"
                className="group relative px-8 py-4 bg-white/10 backdrop-blur-sm rounded-xl overflow-hidden transition-all duration-300 hover:bg-white/20"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <span className="relative z-10 text-white font-medium">Entre em contato</span>
              </a>
              <a
                href="#projetos"
                className="group relative px-8 py-4 bg-white/10 backdrop-blur-sm rounded-xl overflow-hidden transition-all duration-300 hover:bg-white/20"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <span className="relative z-10 text-white font-medium">Ver projetos</span>
              </a>
            </div>

            {/* Tech Stack Pills */}
            <div className="mt-16 animate-fade-in-up opacity-0" style={{ animationDelay: '0.6s', animationFillMode: 'forwards' }}>
              <div className="flex flex-wrap gap-3">
                {['React', 'TypeScript', 'Node.js', 'Tailwind CSS'].map((tech, index) => (
                  <span
                    key={tech}
                    className="px-4 py-2 bg-white/5 backdrop-blur-sm rounded-full text-sm text-white/80 border border-white/10 hover:bg-white/10 transition-colors"
                    style={{ animationDelay: `${0.8 + index * 0.1}s` }}
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            {/* Scroll Indicator */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
              <div className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center p-2">
                <div className="w-1.5 h-3 bg-white/50 rounded-full animate-scroll"></div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="space-y-20">
        {/* 2. Sobre - Apresentação pessoal e profissional */}
        <section
          id="sobre"
          className={`py-24 bg-white ${sectionBaseClasses} ${
            isVisible['sobre'] ? sectionVisibleClasses : sectionHiddenClasses
          }`}
        >
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4">Sobre Mim</h2>
              <div className="w-20 h-1 bg-gradient-to-r from-blue-600 to-indigo-600 mx-auto rounded-full mb-4"></div>
              <p className="text-gray-600 text-lg">Desenvolvedor Full Stack & Entusiasta de Tecnologia</p>
            </div>
            
            <div className="max-w-7xl mx-auto">
              <div className="grid md:grid-cols-12 gap-12 items-center">
                {/* Coluna da Foto */}
                <div className="md:col-span-5 order-2 md:order-1">
                  <div className="relative">
                    {/* Círculo decorativo */}
                    <div className="absolute -top-4 -left-4 w-72 h-72 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-full blur-2xl"></div>
                    {/* Círculo decorativo 2 */}
                    <div className="absolute -bottom-4 -right-4 w-72 h-72 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full blur-2xl"></div>
                    
                    {/* Container da Foto */}
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl transform rotate-6 group-hover:rotate-12 transition-transform duration-300"></div>
                      <img
                        src="sua-foto.jpg"
                        alt="Desenvolvedor"
                        className="relative rounded-2xl shadow-xl w-full object-cover aspect-[4/5] transform -rotate-3 group-hover:rotate-0 transition-transform duration-300"
                      />
                      {/* Decoração */}
                      <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white rounded-xl shadow-lg flex items-center justify-center transform rotate-12 group-hover:rotate-45 transition-transform duration-300">
                        <Code2 className="w-12 h-12 text-blue-600" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Coluna do Conteúdo */}
                <div className="md:col-span-7 order-1 md:order-2">
                  <div className="space-y-8">
                    {/* Título e Subtítulo */}
                    <div>
                      <h3 className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-transparent bg-clip-text">
                        Transformando ideias em realidade digital
                      </h3>
                      <p className="text-gray-600 text-lg leading-relaxed">
                        Com mais de 5 anos de experiência em desenvolvimento web, especializo-me em criar soluções 
                        digitais inovadoras e eficientes. Minha jornada inclui trabalhos em startups e empresas 
                        de tecnologia, onde desenvolvi habilidades sólidas em diversas tecnologias modernas.
                      </p>
                    </div>

                    {/* Cards de Especialidades */}
                    <div className="grid sm:grid-cols-2 gap-6">
                      <div className="bg-gray-50 rounded-xl p-6 hover:bg-gray-100 transition-colors duration-300">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 mb-4">
                          <Code2 className="w-6 h-6" />
                        </div>
                        <h4 className="text-xl font-semibold mb-2">Desenvolvimento Full Stack</h4>
                        <p className="text-gray-600">Experiência em front-end e back-end, criando aplicações web completas e escaláveis.</p>
                      </div>

                      <div className="bg-gray-50 rounded-xl p-6 hover:bg-gray-100 transition-colors duration-300">
                        <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 mb-4">
                          <User2 className="w-6 h-6" />
                        </div>
                        <h4 className="text-xl font-semibold mb-2">Trabalho em Equipe</h4>
                        <p className="text-gray-600">Forte capacidade de colaboração e comunicação efetiva em equipes multidisciplinares.</p>
                      </div>
                    </div>

                    {/* Estatísticas */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 py-8">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600 mb-1">5+</div>
                        <div className="text-sm text-gray-600">Anos de<br />Experiência</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600 mb-1">50+</div>
                        <div className="text-sm text-gray-600">Projetos<br />Completados</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600 mb-1">30+</div>
                        <div className="text-sm text-gray-600">Clientes<br />Satisfeitos</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600 mb-1">100%</div>
                        <div className="text-sm text-gray-600">Taxa de<br />Satisfação</div>
                      </div>
                    </div>

                    {/* Links Sociais */}
                    <div className="flex flex-wrap gap-4">
                      <a
                        href="https://github.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all duration-300 hover:-translate-y-1 shadow-lg hover:shadow-xl"
                      >
                        <Github className="w-5 h-5" />
                        <span>GitHub</span>
                      </a>
                      <a
                        href="https://linkedin.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 hover:-translate-y-1 shadow-lg hover:shadow-xl"
                      >
                        <Linkedin className="w-5 h-5" />
                        <span>LinkedIn</span>
                      </a>
                      <a
                        href="#contato"
                        className="flex items-center gap-2 px-6 py-3 border-2 border-blue-600 text-blue-600 rounded-xl hover:bg-blue-50 transition-all duration-300 hover:-translate-y-1"
                      >
                        <Mail className="w-5 h-5" />
                        <span>Contato</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Habilidades - Mostrar expertise técnica */}
        <section
          id="habilidades"
          className={`py-24 bg-gray-50 ${sectionBaseClasses} ${
            isVisible['habilidades'] ? sectionVisibleClasses : sectionHiddenClasses
          }`}
        >
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4">Habilidades</h2>
              <div className="w-20 h-1 bg-blue-600 mx-auto rounded-full mb-4"></div>
              <p className="text-gray-600 text-lg">Tecnologias e ferramentas que domino</p>
            </div>
            
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                {skills.map((skill) => (
                  <div
                    key={skill.id}
                    className="group relative bg-white rounded-xl shadow-md hover:shadow-xl p-8 transform hover:-translate-y-2 transition-all duration-300"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    <div className="relative z-10">
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 mb-4 transform group-hover:scale-110 transition-transform duration-300">
                          <img
                            src={getSkillIcon(skill.name)}
                            alt={skill.name}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-800 group-hover:text-blue-600 transition-colors duration-300">
                          {skill.name}
                        </h3>
                      </div>
                      
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 rounded-full"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Seção de estatísticas */}
            <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600 mb-2">{skills.length}</div>
                <div className="text-gray-600">Tecnologias</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600 mb-2">5+</div>
                <div className="text-gray-600">Anos de Experiência</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600 mb-2">{projects.length}</div>
                <div className="text-gray-600">Projetos</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600 mb-2">100%</div>
                <div className="text-gray-600">Satisfação</div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Projetos - Demonstração prática das habilidades */}
        <section
          id="projetos"
          className={`py-24 bg-white ${sectionBaseClasses} ${
            isVisible['projetos'] ? sectionVisibleClasses : sectionHiddenClasses
          }`}
        >
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4">Projetos</h2>
              <div className="w-20 h-1 bg-blue-600 mx-auto rounded-full mb-4"></div>
              <p className="text-gray-600 text-lg mb-8">Conheça alguns dos meus trabalhos recentes</p>
              
              {/* Filtros de Categoria */}
              <div className="flex flex-wrap justify-center gap-4 mb-12">
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                      selectedCategory === category.id
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </div>
            
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-100 border-t-blue-600"></div>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-red-500 text-lg">{error}</p>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">
                  {selectedCategory === 'todos' 
                    ? 'Nenhum projeto encontrado'
                    : `Nenhum projeto encontrado na categoria ${categories.find(c => c.id === selectedCategory)?.label}`
                  }
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
                {filteredProjects.map(project => (
                  <div 
                    key={project.id} 
                    className="group bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-500 hover:-translate-y-2"
                  >
                    {/* Categoria Badge */}
                    <div className="absolute top-4 left-4 z-10">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        project.category === 'web' ? 'bg-blue-100 text-blue-600' :
                        project.category === 'mobile' ? 'bg-green-100 text-green-600' :
                        project.category === 'desktop' ? 'bg-purple-100 text-purple-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {categories.find(c => c.id === project.category)?.label}
                      </span>
                    </div>

                    {project.image && (
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={project.image}
                          alt={project.title}
                          className="w-full h-full object-cover transform transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      </div>
                    )}
                    <div className="p-6">
                      <h3 className="text-xl font-bold mb-3 group-hover:text-blue-600 transition-colors">{project.title}</h3>
                      <p className="text-gray-600 mb-4 line-clamp-3">{project.description}</p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {project.tags && project.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-sm font-medium hover:bg-blue-100 transition-colors"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      {project.link && (
                        <a
                          href={project.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-blue-600 hover:text-blue-700 transition-colors group"
                        >
                          <span>Ver projeto</span>
                          <ExternalLink className="w-4 h-4 ml-2 transform transition-transform group-hover:translate-x-1" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 5. Contato - Call to action final */}
        <section
          id="contato"
          className={`py-24 bg-gradient-to-b from-gray-50 to-gray-100 ${sectionBaseClasses} ${
            isVisible['contato'] ? sectionVisibleClasses : sectionHiddenClasses
          }`}
        >
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4">Vamos Trabalhar Juntos?</h2>
              <div className="w-20 h-1 bg-blue-600 mx-auto rounded-full mb-4"></div>
              <p className="text-gray-600 text-lg">Entre em contato para discutirmos seu próximo projeto</p>
            </div>
            
            <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
              {/* Informações de Contato */}
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h3 className="text-2xl font-bold mb-6">Informações de Contato</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Mail className="w-6 h-6 text-blue-600" />
                    <a href="mailto:seu@email.com" className="text-gray-600 hover:text-blue-600 transition-colors">
                      seu@email.com
                    </a>
                  </div>
                  <div className="flex items-center gap-4">
                    <Github className="w-6 h-6 text-blue-600" />
                    <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-blue-600 transition-colors">
                      GitHub
                    </a>
                  </div>
                  <div className="flex items-center gap-4">
                    <Linkedin className="w-6 h-6 text-blue-600" />
                    <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-blue-600 transition-colors">
                      LinkedIn
                    </a>
                  </div>
                </div>
              </div>

              {/* Formulário de Contato */}
              <div className="bg-white rounded-xl shadow-lg p-8">
                <form className="space-y-6">
                  <div>
                    <label htmlFor="name" className="block text-gray-700 font-medium mb-2">
                      Nome
                    </label>
                    <input
                      type="text"
                      id="name"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                      placeholder="Seu nome"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block text-gray-700 font-medium mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                      placeholder="seu@email.com"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="message" className="block text-gray-700 font-medium mb-2">
                      Mensagem
                    </label>
                    <textarea
                      id="message"
                      rows={4}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                      placeholder="Sua mensagem"
                    ></textarea>
                  </div>
                  
                  <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-300"
                  >
                    Enviar mensagem
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer - Informações finais e links importantes */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <h3 className="text-xl font-bold mb-2">Portfólio</h3>
              <p className="text-gray-400">Desenvolvido com React e Tailwind CSS</p>
            </div>
            <div className="flex gap-6">
              {[
                { icon: Github, href: 'https://github.com' },
                { icon: Linkedin, href: 'https://linkedin.com' },
                { icon: Mail, href: 'mailto:seu@email.com' },
              ].map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-400 transition-colors transform hover:-translate-y-1 duration-300"
                >
                  <social.icon className="w-6 h-6" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;