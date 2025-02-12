import { useEffect, useState, FC } from 'react';
import { Github, Linkedin, Mail, ExternalLink, Code2, Share2 } from 'lucide-react';
import { supabase } from './lib/supabase';
import { Navigate, useLocation, BrowserRouter, Routes, Route } from 'react-router-dom';
import Admin from './Admin';
import { LinkedInCallback } from './components/LinkedInCallback';
import Portfolio from './Portfolio';

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

// Adicione estas novas animações no início do componente App

// Função auxiliar para obter o ícone correto baseado no nome da skill
const iconMap: { [key: string]: string } = {
  // Frontend
  react: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg',
  nextjs: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nextjs/nextjs-original.svg',
  vue: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vuejs/vuejs-original.svg',
  angular: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/angularjs/angularjs-original.svg',
  svelte: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/svelte/svelte-original.svg',
  javascript: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg',
  typescript: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg',
  html5: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg',
  css3: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-original.svg',
  tailwindcss: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tailwindcss/tailwindcss-plain.svg',
  bootstrap: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/bootstrap/bootstrap-original.svg',
  materialui: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/materialui/materialui-original.svg',
  chakraui: 'https://img.icons8.com/color/48/000000/chakra-ui.png', 

  // Backend
  nodejs: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg',
  express: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/express/express-original.svg',
  nestjs: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nestjs/nestjs-plain.svg',
  django: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/django/django-plain.svg',
  flask: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/flask/flask-original.svg',
  ruby: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/ruby/ruby-original.svg',
  rails: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/rails/rails-original-wordmark.svg',
  php: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/php/php-original.svg',
  laravel: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/laravel/laravel-plain.svg',
  springboot: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/spring/spring-original.svg',
  go: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/go/go-original.svg',
  rust: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/rust/rust-plain.svg',

  // Banco de Dados
  postgresql: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg',
  mysql: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mysql/mysql-original.svg',
  sqlite: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/sqlite/sqlite-original.svg',
  mongodb: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg',
  redis: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/redis/redis-original.svg',
  firebase: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/firebase/firebase-plain.svg',

  // Mobile
  flutter: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/flutter/flutter-original.svg',
  reactnative: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg',
  swift: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/swift/swift-original.svg',
  kotlin: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/kotlin/kotlin-original.svg',

  // DevOps & Cloud
  docker: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg',
  kubernetes: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/kubernetes/kubernetes-plain.svg',
  aws: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/amazonwebservices/amazonwebservices-original.svg',
  azure: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/azure/azure-original.svg',
  googlecloud: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/googlecloud/googlecloud-original.svg',
  terraform: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/terraform/terraform-original.svg',

  // Ferramentas & Outros
  git: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/git/git-original.svg',
  github: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/github/github-original.svg',
  gitlab: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/gitlab/gitlab-original.svg',
  vscode: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vscode/vscode-original.svg',
  figma: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/figma/figma-original.svg',
  photoshop: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/photoshop/photoshop-line.svg',

  // Inteligência Artificial & Machine Learning
  python: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg',
  tensorflow: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tensorflow/tensorflow-original.svg',
  pytorch: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/pytorch/pytorch-original.svg',
  opencv: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/opencv/opencv-original.svg',

  // Blockchain
  solidity: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/solidity/solidity-original.svg',
  ethereum: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/ethereum/ethereum-original.svg',
  hardhat: 'https://img.icons8.com/external-tal-revivo-color-tal-revivo/96/external-hardhat-an-ethereum-development-environment-written-in-javascript-logo-color-tal-revivo.png'
};

export { iconMap };

// Adicione este novo tipo
type AboutMe = {
  id: string;
  title: string;
  description: string;
  developer_name: string;
  contacts: {
    linkedin: string;
    email: string;
    whatsapp: string;
    github: string;
  };
  stats: {
    years_experience: number;
    projects_completed: number;
    clients_satisfied: number;
    satisfaction_rate: number;
  };
};

// Adicione o tipo Message
type Message = {
  name: string;
  email: string;
  message: string;
};

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const location = useLocation();

  useEffect(() => {
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(!!session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setAuthenticated(!!session);
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

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
  const [aboutMe, setAboutMe] = useState<AboutMe | null>(null);
  const [developerImage, setDeveloperImage] = useState<string>('');
  const [messageForm, setMessageForm] = useState<Message>({
    name: '',
    email: '',
    message: ''
  });
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageSent, setMessageSent] = useState(false);

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

  // Adicione esta nova função para controlar o scroll suave
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    fetchData();
    
    // Buscar imagem do desenvolvedor
    const fetchDeveloperImage = async () => {
      try {
        const { data: aboutMeData, error: aboutError } = await supabase
          .from('about_me')
          .select('image_url')
          .single();
        
        if (aboutError) throw aboutError;
        
        if (aboutMeData?.image_url) {
          setDeveloperImage(aboutMeData.image_url);
        }
      } catch (error) {
        console.error('Erro ao carregar imagem:', error);
      }
    };

    fetchDeveloperImage();

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
      
      // Fetch about me data
      const { data: aboutData, error: aboutError } = await supabase
        .from('about_me')
        .select('*, image_url')
        .single();

      // Se houver erro mas não for o erro de registro não encontrado, lança o erro
      if (aboutError && aboutError.code !== 'PGRST116') {
        console.error('Erro ao buscar dados do about:', aboutError);
        throw aboutError;
      }

      // Se não houver dados, define um valor padrão
      setAboutMe(aboutData || {
        id: '',
        title: 'Sobre Mim',
        description: 'Desenvolvedor Full Stack apaixonado por criar soluções inovadoras e experiências digitais incríveis.',
        developer_name: 'Seu Nome',
        contacts: {
          linkedin: '',
          email: '',
          whatsapp: '',
          github: ''
        },
        stats: {
          years_experience: 0,
          projects_completed: 0,
          clients_satisfied: 0,
          satisfaction_rate: 0
        }
      });
      
      if (aboutData?.image_url) {
        setDeveloperImage(aboutData.image_url);
      }
      
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSendingMessage(true);
      
      // Obter o ID do usuário do about_me
      const { data: aboutData } = await supabase
        .from('about_me')
        .select('user_id')
        .single();

      if (!aboutData?.user_id) {
        throw new Error('Usuário não encontrado');
      }
      
      const { error } = await supabase
        .from('messages')
        .insert([{
          ...messageForm,
          user_id: aboutData.user_id
        }]);

      if (error) throw error;

      setMessageForm({ name: '', email: '', message: '' });
      setMessageSent(true);
      setTimeout(() => setMessageSent(false), 5000);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  // Função para obter o ícone da skill
  const getSkillIcon = (skillName: string) => {
    const normalizedName = skillName.toLowerCase();
    const defaultProgrammingIcon = 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/devicon/devicon-original.svg';
    return iconMap[normalizedName] || defaultProgrammingIcon;
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
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Portfolio />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/linkedin-callback" element={<LinkedInCallback />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;