import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  FolderKanban, 
  Wrench, 
  LogOut, 
  Plus,
  Trash2,
  Edit,
  Save,
  X,
  User2,
  MessageSquare,
  Check
} from 'lucide-react';
import { supabase } from './lib/supabase';
import emailjs from '@emailjs/browser';
import { toast } from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';
import AIChat from './components/AIChat';

type Project = {
  id: string;
  title: string;
  description: string;
  image: string;
  tags: string[];
  link: string;
  user_id?: string;
  category: 'web' | 'mobile' | 'desktop' | 'outros';
};

type Skill = {
  id: string;
  name: string;
  user_id?: string;
};

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

type Message = {
  id: string;
  name: string;
  email: string;
  message: string;
  read: boolean;
  created_at: string;
};

type MessageReply = {
  id: string;
  message_id: string;
  content: string;
  created_at: string;
};

type ReplyModalState = {
  isOpen: boolean;
  to: string;
  subject: string;
  message: string;
  replyingTo: Message | null;
  replies: MessageReply[];
};

// Adicione estas constantes no início do arquivo (fora do componente)
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

// Primeiro, vamos adicionar alguns tipos úteis
type DashboardStats = {
  totalMessages: number;
  unreadMessages: number;
  totalProjects: number;
  totalSkills: number;
  messagesByMonth: {
    month: string;
    count: number;
  }[];
  projectsByCategory: {
    category: string;
    count: number;
  }[];
  recentMessages: Message[];
  recentProjects: Project[];
};

function Admin() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [projects, setProjects] = useState<Project[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [newSkill, setNewSkill] = useState('');
  const [loading, setLoading] = useState(true);
  const [aboutMe, setAboutMe] = useState<AboutMe | null>(null);
  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [replyModal, setReplyModal] = useState<ReplyModalState>({
    isOpen: false,
    to: '',
    subject: '',
    message: '',
    replyingTo: null,
    replies: []
  });
  const [sendingReply, setSendingReply] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalMessages: 0,
    unreadMessages: 0,
    totalProjects: 0,
    totalSkills: 0,
    messagesByMonth: [],
    projectsByCategory: [],
    recentMessages: [],
    recentProjects: []
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = '/login';
      }
    };
    
    checkAuth();
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      
      if (!userId) {
        throw new Error('Usuário não autenticado');
      }
      
      // Fetch projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId);
      
      if (projectsError) throw projectsError;
      setProjects(projectsData || []);

      // Fetch skills
      const { data: skillsData, error: skillsError } = await supabase
        .from('skills')
        .select('*')
        .eq('user_id', userId);
      
      if (skillsError) throw skillsError;
      setSkills(skillsData || []);

      // Fetch about me data
      const { data: aboutData, error: aboutError } = await supabase
        .from('about_me')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (aboutError && aboutError.code !== 'PGRST116') {
        console.error('Erro ao buscar dados do about:', aboutError);
        throw aboutError;
      }

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

      // Fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (messagesError) throw messagesError;
      console.log('Mensagens recebidas:', messagesData);
      setMessages(messagesData || []);
      setUnreadCount(messagesData?.filter(msg => !msg.read).length || 0);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProject = () => {
    const newProject: Project = {
      id: '',
      title: '',
      description: '',
      image: '',
      tags: [],
      link: '',
      category: 'outros'
    };
    setEditingProject(newProject);
  };

  const handleSaveProject = async () => {
    if (!editingProject) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      
      if (!userId) {
        throw new Error('Usuário não autenticado');
      }

      if (!editingProject.category) {
        alert('Por favor, selecione uma categoria');
        return;
      }

      if (editingProject.id) {
        // Update existing project
        const { error } = await supabase
          .from('projects')
          .update({
            title: editingProject.title,
            description: editingProject.description,
            image: editingProject.image,
            tags: editingProject.tags,
            link: editingProject.link,
            category: editingProject.category,
            user_id: userId
          })
          .eq('id', editingProject.id);

        if (error) throw error;
      } else {
        // Create new project
        const { error } = await supabase
          .from('projects')
          .insert([{
            title: editingProject.title,
            description: editingProject.description,
            image: editingProject.image,
            tags: editingProject.tags,
            link: editingProject.link,
            category: editingProject.category,
            user_id: userId
          }]);

        if (error) throw error;
      }

      await fetchData();
      setEditingProject(null);
    } catch (error) {
      console.error('Error saving project:', error);
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  };

  const handleAddSkill = async () => {
    if (newSkill.trim()) {
      try {
        // Obter o ID do usuário atual
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        
        if (!userId) {
          throw new Error('Usuário não autenticado');
        }

        const { error } = await supabase
          .from('skills')
          .insert([{ 
            name: newSkill.trim(),
            user_id: userId 
          }]);

        if (error) {
          console.error('Erro ao adicionar habilidade:', error);
          return;
        }

        await fetchData(); // Recarrega os dados
        setNewSkill(''); // Limpa o input
      } catch (error) {
        console.error('Erro ao adicionar habilidade:', error);
      }
    }
  };

  const handleDeleteSkill = async (skillId: string) => {
    try {
      const { error } = await supabase
        .from('skills')
        .delete()
        .eq('id', skillId);

      if (error) {
        console.error('Erro ao deletar habilidade:', error);
        return;
      }

      await fetchData(); // Recarrega os dados
    } catch (error) {
      console.error('Erro ao deletar habilidade:', error);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      window.location.href = '/';
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleSaveAbout = async () => {
    if (!aboutMe) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      
      if (!userId) {
        throw new Error('Usuário não autenticado');
      }

      if (aboutMe.id) {
        const { error } = await supabase
          .from('about_me')
          .update({
            title: aboutMe.title,
            description: aboutMe.description,
            developer_name: aboutMe.developer_name,
            contacts: aboutMe.contacts,
            stats: aboutMe.stats,
            user_id: userId
          })
          .eq('id', aboutMe.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('about_me')
          .insert([{
            title: aboutMe.title,
            description: aboutMe.description,
            developer_name: aboutMe.developer_name,
            contacts: aboutMe.contacts,
            stats: aboutMe.stats,
            user_id: userId
          }]);

        if (error) throw error;
      }

      setIsEditingAbout(false);
      await fetchData();
    } catch (error) {
      console.error('Error saving about:', error);
    }
  };

  const handleMarkAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ read: true })
        .eq('id', messageId);

      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const fetchMessageReplies = async (messageId: string) => {
    try {
      const { data: repliesData, error } = await supabase
        .from('message_replies')
        .select('*')
        .eq('message_id', messageId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return repliesData || [];
    } catch (error) {
      console.error('Erro ao buscar respostas:', error);
      return [];
    }
  };

  const handleOpenReply = async (message: Message) => {
    const replies = await fetchMessageReplies(message.id);
    
    setReplyModal({
      isOpen: true,
      to: message.email,
      subject: `Re: Contato do Portfólio`,
      message: '',
      replyingTo: message,
      replies
    });
  };

  const handleCloseReply = () => {
    setReplyModal({
      isOpen: false,
      to: '',
      subject: '',
      message: '',
      replyingTo: null,
      replies: []
    });
  };

  const handleSendReply = async () => {
    if (!replyModal.message.trim()) {
      toast.error('Por favor, escreva uma mensagem');
      return;
    }

    try {
      setSendingReply(true);
      const loadingToast = toast.loading('Enviando resposta...');

      // Enviar email
      const templateParams = {
        to_name: replyModal.replyingTo?.name,
        to_email: replyModal.to,
        from_name: aboutMe?.developer_name,
        subject: replyModal.subject,
        message: replyModal.message,
        reply_to: aboutMe?.contacts.email
      };

      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        templateParams,
        EMAILJS_PUBLIC_KEY
      );

      // Salvar resposta no banco
      if (replyModal.replyingTo) {
        const { error: replyError } = await supabase
          .from('message_replies')
          .insert([{
            message_id: replyModal.replyingTo.id,
            content: replyModal.message,
            user_id: (await supabase.auth.getSession()).data.session?.user.id
          }]);

        if (replyError) throw replyError;

        // Marcar mensagem como lida
        await handleMarkAsRead(replyModal.replyingTo.id);
      }

      handleCloseReply();
      toast.success('Resposta enviada com sucesso!', {
        id: loadingToast
      });
    } catch (error) {
      console.error('Erro ao enviar resposta:', error);
      toast.error('Erro ao enviar resposta. Tente novamente.');
    } finally {
      setSendingReply(false);
    }
  };

  // Adicione a função para calcular as estatísticas
  const calculateDashboardStats = () => {
    // Total de mensagens e não lidas
    const totalMessages = messages.length;
    const unreadMessages = messages.filter(m => !m.read).length;

    // Total de projetos e skills
    const totalProjects = projects.length;
    const totalSkills = skills.length;

    // Mensagens por mês (últimos 6 meses)
    const messagesByMonth = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const month = date.toLocaleString('pt-BR', { month: 'short' });
      const count = messages.filter(m => {
        const msgDate = new Date(m.created_at);
        return msgDate.getMonth() === date.getMonth() && 
               msgDate.getFullYear() === date.getFullYear();
      }).length;
      return { month, count };
    }).reverse();

    // Projetos por categoria
    const projectsByCategory = Object.entries(
      projects.reduce((acc, proj) => {
        acc[proj.category] = (acc[proj.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([category, count]) => ({ category, count }));

    // Mensagens e projetos recentes
    const recentMessages = messages.slice(0, 3);
    const recentProjects = projects.slice(0, 3);

    setDashboardStats({
      totalMessages,
      unreadMessages,
      totalProjects,
      totalSkills,
      messagesByMonth,
      projectsByCategory,
      recentMessages,
      recentProjects
    });
  };

  // Atualize useEffect para calcular as estatísticas
  useEffect(() => {
    calculateDashboardStats();
  }, [messages, projects, skills]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-xl text-gray-600">Carregando...</div>
      </div>
    );
  }

  console.log('Estado atual das mensagens:', messages);

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <Toaster position="top-right" />
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg">
        <div className="p-6">
          <h1 className="text-xl font-bold text-gray-800">Admin Panel</h1>
        </div>
        <nav className="mt-6">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-colors ${
              activeTab === 'dashboard' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-colors ${
              activeTab === 'projects' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <FolderKanban className="w-5 h-5" />
            Projetos
          </button>
          <button
            onClick={() => setActiveTab('skills')}
            className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-colors ${
              activeTab === 'skills' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Wrench className="w-5 h-5" />
            Habilidades
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-colors ${
              activeTab === 'about' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <User2 className="w-5 h-5" />
            Sobre Mim
          </button>
          <button
            onClick={() => setActiveTab('inbox')}
            className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-colors ${
              activeTab === 'inbox' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            Inbox
            {unreadCount > 0 && (
              <span className="ml-auto bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-6 py-3 text-left text-red-600 hover:bg-red-50 transition-colors mt-auto"
          >
            <LogOut className="w-5 h-5" />
            Sair
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Dashboard</h2>

            {/* Cards de Métricas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total de Projetos</p>
                    <h3 className="text-2xl font-bold text-gray-900">{dashboardStats.totalProjects}</h3>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <FolderKanban className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div className="mt-4 text-sm text-gray-600">
                  Em {dashboardStats.projectsByCategory.length} categorias
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Habilidades</p>
                    <h3 className="text-2xl font-bold text-gray-900">{dashboardStats.totalSkills}</h3>
                  </div>
                  <div className="bg-green-100 p-3 rounded-lg">
                    <Wrench className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <div className="mt-4 text-sm text-gray-600">
                  Tecnologias dominadas
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Mensagens</p>
                    <h3 className="text-2xl font-bold text-gray-900">{dashboardStats.totalMessages}</h3>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <MessageSquare className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
                <div className="mt-4 text-sm text-gray-600">
                  {dashboardStats.unreadMessages} não lidas
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Anos de Experiência</p>
                    <h3 className="text-2xl font-bold text-gray-900">{aboutMe?.stats.years_experience}+</h3>
                  </div>
                  <div className="bg-yellow-100 p-3 rounded-lg">
                    <User2 className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
                <div className="mt-4 text-sm text-gray-600">
                  {aboutMe?.stats.projects_completed} projetos completados
                </div>
              </div>
            </div>

            {/* Gráficos e Listas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Mensagens por Mês */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Mensagens Recebidas</h3>
                <div className="h-64">
                  <div className="flex h-full items-end gap-2">
                    {dashboardStats.messagesByMonth.map((item) => (
                      <div key={item.month} className="flex-1 flex flex-col items-center">
                        <div 
                          className="w-full bg-blue-500 rounded-t"
                          style={{ 
                            height: `${(item.count / Math.max(...dashboardStats.messagesByMonth.map(m => m.count))) * 100}%`,
                            minHeight: '20px'
                          }}
                        ></div>
                        <span className="text-sm mt-2">{item.month}</span>
                        <span className="text-xs text-gray-600">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Projetos por Categoria */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Projetos por Categoria</h3>
                <div className="space-y-4">
                  {dashboardStats.projectsByCategory.map((item) => (
                    <div key={item.category} className="flex items-center">
                      <span className="flex-1 text-gray-600 capitalize">{item.category}</span>
                      <div className="flex-1">
                        <div className="h-2 bg-gray-200 rounded-full">
                          <div 
                            className="h-full bg-blue-600 rounded-full"
                            style={{ 
                              width: `${(item.count / dashboardStats.totalProjects) * 100}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                      <span className="ml-4 text-sm font-medium">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mensagens Recentes */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Mensagens Recentes</h3>
                <div className="space-y-4">
                  {dashboardStats.recentMessages.map((message) => (
                    <div key={message.id} className="flex items-start gap-4">
                      <div className="bg-gray-100 p-2 rounded-full">
                        <User2 className="w-5 h-5 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{message.name}</p>
                        <p className="text-sm text-gray-600 truncate">{message.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(message.created_at).toLocaleString()}
                        </p>
                      </div>
                      {!message.read && (
                        <span className="bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded-full">
                          Novo
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Projetos Recentes */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Projetos Recentes</h3>
                <div className="space-y-4">
                  {dashboardStats.recentProjects.map((project) => (
                    <div key={project.id} className="flex items-start gap-4">
                      <img 
                        src={project.image} 
                        alt={project.title}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{project.title}</p>
                        <p className="text-sm text-gray-600 truncate">{project.description}</p>
                        <div className="flex gap-2 mt-2">
                          {project.tags.slice(0, 2).map((tag) => (
                            <span 
                              key={tag}
                              className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                          {project.tags.length > 2 && (
                            <span className="text-xs text-gray-500">
                              +{project.tags.length - 2}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full capitalize ${
                        project.category === 'web' ? 'bg-blue-100 text-blue-600' :
                        project.category === 'mobile' ? 'bg-green-100 text-green-600' :
                        project.category === 'desktop' ? 'bg-purple-100 text-purple-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {project.category}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chat IA */}
              <div className="mt-6">
                <AIChat 
                  dashboardStats={dashboardStats}
                  aboutMe={aboutMe}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'projects' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Gerenciar Projetos</h2>
              <button
                onClick={handleAddProject}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Novo Projeto
              </button>
            </div>

            {editingProject ? (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold">
                    {editingProject.id ? 'Editar Projeto' : 'Novo Projeto'}
                  </h3>
                  <button
                    onClick={() => setEditingProject(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Título
                    </label>
                    <input
                      type="text"
                      value={editingProject.title}
                      onChange={e => setEditingProject({ ...editingProject, title: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descrição
                    </label>
                    <textarea
                      value={editingProject.description}
                      onChange={e => setEditingProject({ ...editingProject, description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      URL da Imagem
                    </label>
                    <input
                      type="text"
                      value={editingProject.image}
                      onChange={e => setEditingProject({ ...editingProject, image: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tags (separadas por vírgula)
                    </label>
                    <input
                      type="text"
                      value={editingProject.tags.join(', ')}
                      onChange={e => setEditingProject({
                        ...editingProject,
                        tags: e.target.value.split(',').map(tag => tag.trim())
                      })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Link do Projeto
                    </label>
                    <input
                      type="text"
                      value={editingProject.link}
                      onChange={e => setEditingProject({ ...editingProject, link: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">
                      Categoria
                    </label>
                    <select
                      value={editingProject.category}
                      onChange={e => setEditingProject({
                        ...editingProject,
                        category: e.target.value as Project['category']
                      })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Selecione uma categoria</option>
                      <option value="web">Web</option>
                      <option value="mobile">Mobile</option>
                      <option value="desktop">Desktop</option>
                      <option value="outros">Outros</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setEditingProject(null)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveProject}
                      className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      Salvar
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {projects.map(project => (
                  <div key={project.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
                    <img
                      src={project.image}
                      alt={project.title}
                      className="w-full h-48 object-cover"
                    />
                    <div className="p-6">
                      <h3 className="text-xl font-semibold mb-2">{project.title}</h3>
                      <p className="text-gray-600 mb-4">{project.description}</p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {project.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-sm"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => handleDeleteProject(project.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setEditingProject(project)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'skills' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Gerenciar Habilidades</h2>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newSkill}
                  onChange={e => setNewSkill(e.target.value)}
                  placeholder="Nova habilidade"
                  className="px-3 py-2 border rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={handleAddSkill}
                  disabled={!newSkill.trim()}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              {loading ? (
                <div className="text-center py-4">Carregando...</div>
              ) : skills.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  Nenhuma habilidade cadastrada
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {skills.map(skill => (
                    <div
                      key={skill.id}
                      className="flex items-center justify-between bg-gray-50 p-3 rounded-lg group hover:bg-gray-100 transition-colors"
                    >
                      <span>{skill.name}</span>
                      <button
                        onClick={() => handleDeleteSkill(skill.id)}
                        className="text-red-600 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'about' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Editar Sobre Mim</h2>
              {!isEditingAbout && (
                <button
                  onClick={() => setIsEditingAbout(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Editar
                </button>
              )}
            </div>

            {isEditingAbout ? (
              <form className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Título
                  </label>
                  <input
                    type="text"
                    value={aboutMe?.title || ''}
                    onChange={e => setAboutMe(prev => prev ? {...prev, title: e.target.value} : null)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descrição
                  </label>
                  <textarea
                    value={aboutMe?.description || ''}
                    onChange={e => setAboutMe(prev => prev ? {...prev, description: e.target.value} : null)}
                    rows={5}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do Desenvolvedor
                  </label>
                  <input
                    type="text"
                    value={aboutMe?.developer_name || ''}
                    onChange={e => setAboutMe(prev => prev ? {...prev, developer_name: e.target.value} : null)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Anos de Experiência
                    </label>
                    <input
                      type="number"
                      value={aboutMe?.stats.years_experience || 0}
                      onChange={e => setAboutMe(prev => prev ? {
                        ...prev,
                        stats: {...prev.stats, years_experience: Number(e.target.value)}
                      } : null)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Projetos Completados
                    </label>
                    <input
                      type="number"
                      value={aboutMe?.stats.projects_completed || 0}
                      onChange={e => setAboutMe(prev => prev ? {
                        ...prev,
                        stats: {...prev.stats, projects_completed: Number(e.target.value)}
                      } : null)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Clientes Satisfeitos
                    </label>
                    <input
                      type="number"
                      value={aboutMe?.stats.clients_satisfied || 0}
                      onChange={e => setAboutMe(prev => prev ? {
                        ...prev,
                        stats: {...prev.stats, clients_satisfied: Number(e.target.value)}
                      } : null)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Taxa de Satisfação (%)
                    </label>
                    <input
                      type="number"
                      value={aboutMe?.stats.satisfaction_rate || 0}
                      onChange={e => setAboutMe(prev => prev ? {
                        ...prev,
                        stats: {...prev.stats, satisfaction_rate: Number(e.target.value)}
                      } : null)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      LinkedIn URL
                    </label>
                    <input
                      type="url"
                      value={aboutMe?.contacts.linkedin || ''}
                      onChange={e => setAboutMe(prev => prev ? {
                        ...prev,
                        contacts: {...prev.contacts, linkedin: e.target.value}
                      } : null)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      GitHub URL
                    </label>
                    <input
                      type="url"
                      value={aboutMe?.contacts.github || ''}
                      onChange={e => setAboutMe(prev => prev ? {
                        ...prev,
                        contacts: {...prev.contacts, github: e.target.value}
                      } : null)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={aboutMe?.contacts.email || ''}
                      onChange={e => setAboutMe(prev => prev ? {
                        ...prev,
                        contacts: {...prev.contacts, email: e.target.value}
                      } : null)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      WhatsApp
                    </label>
                    <input
                      type="tel"
                      value={aboutMe?.contacts.whatsapp || ''}
                      onChange={e => setAboutMe(prev => prev ? {
                        ...prev,
                        contacts: {...prev.contacts, whatsapp: e.target.value}
                      } : null)}
                      placeholder="+55 (99) 99999-9999"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditingAbout(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAbout}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Salvar
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{aboutMe?.title}</h3>
                  <p className="text-gray-600">{aboutMe?.description}</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{aboutMe?.stats.years_experience}+</div>
                    <div className="text-sm text-gray-600">Anos de Experiência</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{aboutMe?.stats.projects_completed}+</div>
                    <div className="text-sm text-gray-600">Projetos Completados</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{aboutMe?.stats.clients_satisfied}+</div>
                    <div className="text-sm text-gray-600">Clientes Satisfeitos</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{aboutMe?.stats.satisfaction_rate}%</div>
                    <div className="text-sm text-gray-600">Taxa de Satisfação</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'inbox' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Mensagens Recebidas</h2>
            
            <div className="grid gap-6">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nenhuma mensagem recebida
                </div>
              ) : (
                messages.map(message => (
                  <div
                    key={message.id}
                    className={`bg-white rounded-lg shadow-lg p-6 ${
                      !message.read ? 'border-l-4 border-blue-600' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">{message.name}</h3>
                        <a
                          href={`mailto:${message.email}`}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          {message.email}
                        </a>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenReply(message)}
                          className="text-blue-600 hover:text-blue-700"
                          title="Responder"
                        >
                          <svg 
                            className="w-5 h-5" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                              strokeWidth={2} 
                              d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" 
                            />
                          </svg>
                        </button>
                        {!message.read && (
                          <button
                            onClick={() => handleMarkAsRead(message.id)}
                            className="text-blue-600 hover:text-blue-700"
                            title="Marcar como lida"
                          >
                            <Check className="w-5 h-5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteMessage(message.id)}
                          className="text-red-600 hover:text-red-700"
                          title="Excluir"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-600 whitespace-pre-wrap">{message.message}</p>
                    <div className="mt-4 text-sm text-gray-500">
                      {new Date(message.created_at).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>

            {replyModal.isOpen && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold">Conversa com {replyModal.replyingTo?.name}</h3>
                    <button
                      onClick={handleCloseReply}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto mb-4 space-y-4">
                    {/* Mensagem original */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="font-medium">{replyModal.replyingTo?.name}</span>
                          <span className="text-sm text-gray-500 ml-2">
                            {new Date(replyModal.replyingTo?.created_at || '').toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <p className="text-gray-700 whitespace-pre-wrap">{replyModal.replyingTo?.message}</p>
                    </div>

                    {/* Histórico de respostas */}
                    {replyModal.replies.map((reply) => (
                      <div key={reply.id} className="bg-blue-50 p-4 rounded-lg ml-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="font-medium">{aboutMe?.developer_name}</span>
                            <span className="text-sm text-gray-500 ml-2">
                              {new Date(reply.created_at).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <p className="text-gray-700 whitespace-pre-wrap">{reply.content}</p>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nova Resposta
                      </label>
                      <textarea
                        rows={4}
                        value={replyModal.message}
                        onChange={e => setReplyModal(prev => ({ ...prev, message: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-blue-500"
                        placeholder="Digite sua resposta..."
                      ></textarea>
                    </div>

                    <div className="flex justify-end gap-3">
                      <button
                        onClick={handleCloseReply}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSendReply}
                        disabled={sendingReply}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {sendingReply ? 'Enviando...' : 'Enviar'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default Admin;