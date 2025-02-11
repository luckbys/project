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
  Check,
  Settings,
  ExternalLink,
  Users
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
  status: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high';
  start_date?: string;
  due_date?: string;
  progress: number;
  assigned_to?: string; // client_id
  tasks: {
    id: string;
    title: string;
    completed: boolean;
    description?: string;
  }[];
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
  priority?: 'high' | 'medium' | 'low';
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

type PriorityConfig = {
  high: string[];
  medium: string[];
};

type ConfigModalState = {
  isOpen: boolean;
  config: PriorityConfig;
};

type MessageFilters = {
  priority: 'all' | 'high' | 'medium' | 'low';
  status: 'all' | 'read' | 'unread';
  date: 'all' | 'today' | 'week' | 'month';
  search: string;
};

type ProjectFilters = {
  category: 'all' | 'web' | 'mobile' | 'desktop' | 'outros';
  search: string;
  tags: string[];
  sortBy: 'recent' | 'title' | 'category';
};

type Client = {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  status: 'active' | 'inactive';
  projects: string[];
  created_at: string;
  notes?: string;
};

type KanbanView = 'kanban' | 'list';

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
  const [configModal, setConfigModal] = useState<ConfigModalState>({
    isOpen: false,
    config: {
      high: ['urgente', 'emergência', 'imediato', 'hoje', 'agora'],
      medium: ['orçamento', 'proposta', 'preço', 'quando', 'prazo']
    }
  });
  const [filters, setFilters] = useState<MessageFilters>({
    priority: 'all',
    status: 'all',
    date: 'all',
    search: ''
  });
  const [projectFilters, setProjectFilters] = useState<ProjectFilters>({
    category: 'all',
    search: '',
    tags: [],
    sortBy: 'recent'
  });
  const [clients, setClients] = useState<Client[]>([]);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientFilters, setClientFilters] = useState({
    search: '',
    status: 'all',
    hasProjects: 'all'
  });
  const [projectView, setProjectView] = useState<KanbanView>('kanban');
  const [draggedProject, setDraggedProject] = useState<Project | null>(null);
  const [quickEditProject, setQuickEditProject] = useState<Project | null>(null);

  const kanbanColumns = {
    backlog: { title: '📋 Backlog', color: 'gray' },
    todo: { title: '📝 A Fazer', color: 'blue' },
    in_progress: { title: '⚡ Em Progresso', color: 'yellow' },
    review: { title: '👀 Revisão', color: 'purple' },
    done: { title: '✅ Concluído', color: 'green' }
  };

  const handleDragStart = (project: Project) => {
    setDraggedProject(project);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (status: Project['status']) => {
    if (!draggedProject) return;
    
    try {
      const updatedProject = { ...draggedProject, status };
      const { error } = await supabase
        .from('projects')
        .update({ status })
        .eq('id', draggedProject.id);
      
      if (error) throw error;
      
      setProjects(prev => prev.map(p => 
        p.id === draggedProject.id ? updatedProject : p
      ));
      
      toast.success('Status do projeto atualizado!');
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    }
    
    setDraggedProject(null);
  };

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
      
      // Adiciona prioridade e ordena as mensagens
      const messagesWithPriority = messagesData?.map(msg => ({
        ...msg,
        priority: calculateMessagePriority(msg.message)
      })) || [];
      
      // Ordena por prioridade e depois por data
      const sortedMessages = messagesWithPriority.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setMessages(sortedMessages);
      setUnreadCount(messagesData?.filter(msg => !msg.read).length || 0);

      // Fetch clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', userId);
      
      if (clientsError) throw clientsError;
      setClients(clientsData || []);

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
      category: 'outros',
      status: 'backlog',
      priority: 'low',
      progress: 0,
      tasks: []
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
            user_id: userId,
            status: editingProject.status,
            priority: editingProject.priority,
            start_date: editingProject.start_date,
            due_date: editingProject.due_date,
            progress: editingProject.progress,
            assigned_to: editingProject.assigned_to,
            tasks: editingProject.tasks
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
            user_id: userId,
            status: editingProject.status,
            priority: editingProject.priority,
            start_date: editingProject.start_date,
            due_date: editingProject.due_date,
            progress: editingProject.progress,
            assigned_to: editingProject.assigned_to,
            tasks: editingProject.tasks
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

  // Atualizar a função calculateMessagePriority para usar a configuração
  const calculateMessagePriority = (message: string): 'high' | 'medium' | 'low' => {
    const lowerMessage = message.toLowerCase();
    
    if (configModal.config.high.some(keyword => lowerMessage.includes(keyword))) {
      return 'high';
    }
    
    if (configModal.config.medium.some(keyword => lowerMessage.includes(keyword))) {
      return 'medium';
    }
    
    return 'low';
  };

  const handleSaveConfig = () => {
    // Recalcular prioridades com a nova configuração
    const updatedMessages = messages.map(msg => ({
      ...msg,
      priority: calculateMessagePriority(msg.message)
    }));

    setMessages(updatedMessages);
    setConfigModal(prev => ({ ...prev, isOpen: false }));
    toast.success('Configurações salvas com sucesso!');
  };

  const filterMessages = (messages: Message[]) => {
    return messages.filter(message => {
      // Filtro de prioridade
      if (filters.priority !== 'all' && message.priority !== filters.priority) {
        return false;
      }

      // Filtro de status
      if (filters.status === 'read' && !message.read) return false;
      if (filters.status === 'unread' && message.read) return false;

      // Filtro de data
      const messageDate = new Date(message.created_at);
      const today = new Date();
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      if (filters.date === 'today' && messageDate.toDateString() !== today.toDateString()) return false;
      if (filters.date === 'week' && messageDate < weekAgo) return false;
      if (filters.date === 'month' && messageDate < monthAgo) return false;

      // Filtro de busca
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return (
          message.name.toLowerCase().includes(searchLower) ||
          message.email.toLowerCase().includes(searchLower) ||
          message.message.toLowerCase().includes(searchLower)
        );
      }

      return true;
    });
  };

  // Função para obter todas as tags únicas dos projetos
  const getAllTags = () => {
    const allTags = new Set<string>();
    projects.forEach(project => {
      project.tags.forEach(tag => allTags.add(tag));
    });
    return Array.from(allTags);
  };

  const filterProjects = (projects: Project[]) => {
    return projects.filter(project => {
      // Filtro de categoria
      if (projectFilters.category !== 'all' && project.category !== projectFilters.category) {
        return false;
      }

      // Filtro de busca
      if (projectFilters.search) {
        const searchLower = projectFilters.search.toLowerCase();
        const matchesSearch = 
          project.title.toLowerCase().includes(searchLower) ||
          project.description.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Filtro de tags
      if (projectFilters.tags.length > 0) {
        const hasAllSelectedTags = projectFilters.tags.every(tag => 
          project.tags.includes(tag)
        );
        if (!hasAllSelectedTags) return false;
      }

      return true;
    }).sort((a, b) => {
      switch (projectFilters.sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'category':
          return a.category.localeCompare(b.category);
        case 'recent':
        default:
          return 0; // Mantém a ordem original (mais recente primeiro)
      }
    });
  };

  const handleSaveClient = async () => {
    if (!editingClient) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      
      if (!userId) throw new Error('Usuário não autenticado');
      
      if (editingClient.id) {
        const { error } = await supabase
          .from('clients')
          .update({ ...editingClient, user_id: userId })
          .eq('id', editingClient.id);
        
        if (error) throw error;
      } else {
        // Remove o id vazio e deixa o Supabase gerar um novo
        const { id, ...clientData } = editingClient;
        const { error } = await supabase
          .from('clients')
          .insert([{ ...clientData, user_id: userId }])
          .select();
        
        if (error) throw error;
      }
      
      await fetchData();
      setEditingClient(null);
      toast.success('Cliente salvo com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      toast.error('Erro ao salvar cliente');
    }
  };

  const handleDeleteClient = async (id: string) => {
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      await fetchData();
      toast.success('Cliente removido com sucesso!');
    } catch (error) {
      console.error('Erro ao deletar cliente:', error);
      toast.error('Erro ao deletar cliente');
    }
  };

  const filterClients = (clients: Client[]) => {
    return clients.filter(client => {
      if (clientFilters.search) {
        const searchLower = clientFilters.search.toLowerCase();
        const matchesSearch = 
          client.name.toLowerCase().includes(searchLower) ||
          client.email.toLowerCase().includes(searchLower) ||
          client.company?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      
      if (clientFilters.status !== 'all' && client.status !== clientFilters.status) {
        return false;
      }
      
      if (clientFilters.hasProjects !== 'all') {
        const hasProjects = client.projects.length > 0;
        if (clientFilters.hasProjects === 'yes' && !hasProjects) return false;
        if (clientFilters.hasProjects === 'no' && hasProjects) return false;
      }
      
      return true;
    });
  };

  const handleQuickSave = async () => {
    if (!quickEditProject) return;
    
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          progress: quickEditProject.progress,
          priority: quickEditProject.priority,
          status: quickEditProject.status,
          due_date: quickEditProject.due_date,
          tasks: quickEditProject.tasks
        })
        .eq('id', quickEditProject.id);
      
      if (error) throw error;
      
      setProjects(prev => prev.map(p => 
        p.id === quickEditProject.id ? quickEditProject : p
      ));
      
      setQuickEditProject(null);
      toast.success('Projeto atualizado!');
    } catch (error) {
      console.error('Erro ao atualizar projeto:', error);
      toast.error('Erro ao atualizar projeto');
    }
  };

  const handleAddTask = () => {
    if (!quickEditProject) return;
    setQuickEditProject({
      ...quickEditProject,
      tasks: [
        ...quickEditProject.tasks,
        {
          id: crypto.randomUUID(),
          title: '',
          completed: false
        }
      ]
    });
  };

  const handleNewClient = () => {
    setEditingClient({
      id: crypto.randomUUID(), // Apenas para o estado local
      name: '',
      email: '',
      phone: '',
      status: 'active',
      projects: [],
      created_at: new Date().toISOString()
    });
  };

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
            onClick={() => setActiveTab('clients')}
            className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-colors ${
              activeTab === 'clients' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Users className="w-5 h-5" />
            Clientes
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
                  messages={messages}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'projects' && (
          <div className="space-y-6">
            <div className="flex flex-col gap-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Projetos</h2>
                <div className="flex items-center gap-4">
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setProjectView('kanban')}
                      className={`px-3 py-1 rounded-md transition-colors ${
                        projectView === 'kanban' 
                          ? 'bg-white shadow text-blue-600' 
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      Kanban
                    </button>
                    <button
                      onClick={() => setProjectView('list')}
                      className={`px-3 py-1 rounded-md transition-colors ${
                        projectView === 'list'
                          ? 'bg-white shadow text-blue-600'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      Lista
                    </button>
                  </div>
                  <button
                    onClick={() => setEditingProject({ 
                      id: '', 
                      title: '', 
                      description: '', 
                      image: '', 
                      tags: [], 
                      link: '',
                      category: 'web'
                    })}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-5 h-5 inline-block mr-2" />
                    Novo Projeto
                  </button>
                </div>
              </div>

              {/* Filtros de Projetos */}
              <div className="bg-white p-4 rounded-lg shadow space-y-4">
                <div className="flex flex-wrap gap-4">
                  {/* Busca */}
                  <div className="flex-1 min-w-[200px]">
                    <input
                      type="text"
                      placeholder="Buscar projetos..."
                      value={projectFilters.search}
                      onChange={e => setProjectFilters(prev => ({ ...prev, search: e.target.value }))}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  {/* Filtro de Categoria */}
                  <select
                    value={projectFilters.category}
                    onChange={e => setProjectFilters(prev => ({ 
                      ...prev, 
                      category: e.target.value as ProjectFilters['category'] 
                    }))}
                    className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Todas Categorias</option>
                    <option value="web">💻 Web</option>
                    <option value="mobile">📱 Mobile</option>
                    <option value="desktop">🖥️ Desktop</option>
                    <option value="outros">🔧 Outros</option>
                  </select>
                  
                  {/* Ordenação */}
                  <select
                    value={projectFilters.sortBy}
                    onChange={e => setProjectFilters(prev => ({ 
                      ...prev, 
                      sortBy: e.target.value as ProjectFilters['sortBy'] 
                    }))}
                    className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="recent">Mais Recentes</option>
                    <option value="title">Por Título</option>
                    <option value="category">Por Categoria</option>
                  </select>
                </div>
                
                {/* Filtro de Tags */}
                <div className="flex flex-wrap gap-2">
                  {getAllTags().map(tag => (
                    <button
                      key={tag}
                      onClick={() => setProjectFilters(prev => ({
                        ...prev,
                        tags: prev.tags.includes(tag)
                          ? prev.tags.filter(t => t !== tag)
                          : [...prev.tags, tag]
                      }))}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        projectFilters.tags.includes(tag)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                
                {/* Contador de Resultados */}
                <div className="text-sm text-gray-600">
                  {filterProjects(projects).length} projetos encontrados
                </div>
              </div>
            </div>

            {projectView === 'kanban' ? (
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 overflow-x-auto">
                {Object.entries(kanbanColumns).map(([status, { title, color }]) => (
                  <div
                    key={status}
                    className="bg-gray-50 rounded-lg p-4 min-h-[500px]"
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(status as Project['status'])}
                  >
                    <div className={`flex items-center justify-between mb-4 text-${color}-600`}>
                      <h3 className="font-semibold">{title}</h3>
                      <span className="text-sm bg-white px-2 py-1 rounded-full">
                        {filterProjects(projects).filter(p => p.status === status).length}
                      </span>
                    </div>
                    
                    <div className="space-y-4">
                      {filterProjects(projects)
                        .filter(project => project.status === status)
                        .map(project => (
                          <div
                            key={project.id}
                            draggable
                            onDragStart={() => handleDragStart(project)}
                            onClick={() => setQuickEditProject(project)}
                            className="bg-white rounded-lg shadow-sm p-4 cursor-move hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-medium">{project.title}</h4>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                project.priority === 'high' ? 'bg-red-100 text-red-600' :
                                project.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                                'bg-blue-100 text-blue-600'
                              }`}>
                                {project.priority === 'high' ? '🔴' :
                                 project.priority === 'medium' ? '🟡' : '🔵'}
                              </span>
                            </div>
                            
                            <div className="text-sm text-gray-500 mb-3">
                              {project.description.substring(0, 100)}...
                            </div>
                            
                            {project.due_date && (
                              <div className="text-xs text-gray-500 mb-2">
                                📅 {new Date(project.due_date).toLocaleDateString()}
                              </div>
                            )}
                            
                            <div className="flex justify-between items-center">
                              <div className="flex gap-2">
                                {project.tags.slice(0, 2).map((tag, index) => (
                                  <span
                                    key={index}
                                    className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                              
                              {project.progress > 0 && (
                                <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-blue-600"
                                    style={{ width: `${project.progress}%` }}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filterProjects(projects).map(project => (
                  <div key={project.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
                    <img
                      src={project.image}
                      alt={project.title}
                      className="w-full h-52 object-cover hover:scale-105 transition-transform duration-300"
                    />
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-xl font-semibold">{project.title}</h3>
                        <span className={`text-xs px-2 py-1 rounded-full capitalize ${
                          project.category === 'web' ? 'bg-blue-100 text-blue-600' :
                          project.category === 'mobile' ? 'bg-green-100 text-green-600' :
                          project.category === 'desktop' ? 'bg-purple-100 text-purple-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {project.category === 'web' ? '💻 Web' :
                           project.category === 'mobile' ? '📱 Mobile' :
                           project.category === 'desktop' ? '🖥️ Desktop' :
                           '🔧 Outros'}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-4">{project.description}</p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {project.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm hover:bg-gray-200 transition-colors"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="flex justify-between items-center mt-4 pt-4 border-t">
                        <a
                          href={project.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                        >
                          Ver projeto
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleDeleteProject(project.id)}
                            className="text-red-600 hover:text-red-700 hover:scale-110 transition-transform"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => setEditingProject(project)}
                            className="text-blue-600 hover:text-blue-700 hover:scale-110 transition-transform"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                        </div>
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
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Mensagens Recebidas</h2>
              <button
                onClick={() => setConfigModal(prev => ({ ...prev, isOpen: true }))}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Settings className="w-5 h-5" />
                <span>Configurar Prioridades</span>
              </button>
            </div>
            
            {/* Filtros */}
            <div className="bg-white p-4 rounded-lg shadow space-y-4">
              <div className="flex flex-wrap gap-4">
                {/* Busca */}
                <div className="flex-1 min-w-[200px]">
                  <input
                    type="text"
                    placeholder="Buscar mensagens..."
                    value={filters.search}
                    onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Filtro de Prioridade */}
                <select
                  value={filters.priority}
                  onChange={e => setFilters(prev => ({ ...prev, priority: e.target.value as MessageFilters['priority'] }))}
                  className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todas Prioridades</option>
                  <option value="high">🔴 Alta Prioridade</option>
                  <option value="medium">🟡 Média Prioridade</option>
                  <option value="low">🔵 Baixa Prioridade</option>
                </select>

                {/* Filtro de Status */}
                <select
                  value={filters.status}
                  onChange={e => setFilters(prev => ({ ...prev, status: e.target.value as MessageFilters['status'] }))}
                  className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todos Status</option>
                  <option value="read">✓ Lidas</option>
                  <option value="unread">○ Não Lidas</option>
                </select>

                {/* Filtro de Data */}
                <select
                  value={filters.date}
                  onChange={e => setFilters(prev => ({ ...prev, date: e.target.value as MessageFilters['date'] }))}
                  className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todas Datas</option>
                  <option value="today">Hoje</option>
                  <option value="week">Última Semana</option>
                  <option value="month">Último Mês</option>
                </select>
              </div>

              {/* Contador de Resultados */}
              <div className="text-sm text-gray-600">
                {filterMessages(messages).length} mensagens encontradas
              </div>
            </div>

            <div className="grid gap-6">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nenhuma mensagem recebida
                </div>
              ) : (
                filterMessages(messages).map(message => (
                  <div
                    key={message.id}
                    className={`bg-white rounded-lg shadow-lg p-6 ${
                      !message.read 
                        ? message.priority === 'high'
                          ? 'border-l-4 border-red-500'
                          : message.priority === 'medium'
                            ? 'border-l-4 border-yellow-500'
                            : 'border-l-4 border-blue-500'
                        : ''
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">{message.name}</h3>
                        <div className="flex items-center gap-2">
                          <a
                            href={`mailto:${message.email}`}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            {message.email}
                          </a>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            message.priority === 'high'
                              ? 'bg-red-100 text-red-600'
                              : message.priority === 'medium'
                                ? 'bg-yellow-100 text-yellow-600'
                                : 'bg-blue-100 text-blue-600'
                          }`}>
                            {message.priority === 'high' ? '🔴 Urgente' :
                             message.priority === 'medium' ? '🟡 Média' : '🔵 Normal'}
                          </span>
                        </div>
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
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm text-gray-500">
                        {new Date(message.created_at).toLocaleString()}
                      </span>
                      {!message.read && (
                        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
                          Não lida
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 whitespace-pre-wrap">{message.message}</p>
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

        {activeTab === 'clients' && (
          <div className="space-y-6">
            <div className="flex flex-col gap-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Clientes</h2>
                <button
                  onClick={handleNewClient}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-5 h-5 inline-block mr-2" />
                  Novo Cliente
                </button>
              </div>
              
              {/* Filtros */}
              <div className="bg-white p-4 rounded-lg shadow space-y-4">
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <input
                      type="text"
                      placeholder="Buscar clientes..."
                      value={clientFilters.search}
                      onChange={e => setClientFilters(prev => ({ ...prev, search: e.target.value }))}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <select
                    value={clientFilters.status}
                    onChange={e => setClientFilters(prev => ({ ...prev, status: e.target.value }))}
                    className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Todos Status</option>
                    <option value="active">✅ Ativos</option>
                    <option value="inactive">❌ Inativos</option>
                  </select>
                  
                  <select
                    value={clientFilters.hasProjects}
                    onChange={e => setClientFilters(prev => ({ ...prev, hasProjects: e.target.value }))}
                    className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Todos Projetos</option>
                    <option value="yes">Com Projetos</option>
                    <option value="no">Sem Projetos</option>
                  </select>
                </div>
                
                <div className="text-sm text-gray-600">
                  {filterClients(clients).length} clientes encontrados
                </div>
              </div>
            </div>
            
            {/* Lista de Clientes */}
            <div className="grid gap-6">
              {filterClients(clients).map(client => (
                <div key={client.id} className="bg-white rounded-lg shadow-lg p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-semibold">{client.name}</h3>
                      <div className="flex items-center gap-4 mt-2 text-gray-600">
                        <a href={`mailto:${client.email}`} className="hover:text-blue-600">
                          {client.email}
                        </a>
                        <span>|</span>
                        <a href={`tel:${client.phone}`} className="hover:text-blue-600">
                          {client.phone}
                        </a>
                      </div>
                      {client.company && (
                        <p className="text-gray-500 mt-1">{client.company}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        client.status === 'active'
                          ? 'bg-green-100 text-green-600'
                          : 'bg-red-100 text-red-600'
                      }`}>
                        {client.status === 'active' ? '✅ Ativo' : '❌ Inativo'}
                      </span>
                    </div>
                  </div>
                  
                  {client.projects.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Projetos Vinculados</h4>
                      <div className="flex flex-wrap gap-2">
                        {client.projects.map(projectId => {
                          const project = projects.find(p => p.id === projectId);
                          return project ? (
                            <span key={projectId} className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-sm">
                              {project.title}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                  
                  {client.notes && (
                    <p className="mt-4 text-gray-600 text-sm">{client.notes}</p>
                  )}
                  
                  <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
                    <button
                      onClick={() => setEditingClient(client)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteClient(client.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Modal de Configuração */}
      {configModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-xl mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">Configurar Prioridades</h3>
              <button
                onClick={() => setConfigModal(prev => ({ ...prev, isOpen: false }))}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Palavras-chave para Prioridade Alta 🔴
                </label>
                <input
                  type="text"
                  value={configModal.config.high.join(', ')}
                  onChange={e => setConfigModal(prev => ({
                    ...prev,
                    config: {
                      ...prev.config,
                      high: e.target.value.split(',').map(word => word.trim())
                    }
                  }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Separe as palavras por vírgula"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Ex: urgente, emergência, imediato
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Palavras-chave para Prioridade Média 🟡
                </label>
                <input
                  type="text"
                  value={configModal.config.medium.join(', ')}
                  onChange={e => setConfigModal(prev => ({
                    ...prev,
                    config: {
                      ...prev.config,
                      medium: e.target.value.split(',').map(word => word.trim())
                    }
                  }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Separe as palavras por vírgula"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Ex: orçamento, proposta, prazo
                </p>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setConfigModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveConfig}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Salvar Configurações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de Cliente */}
      {editingClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-xl mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">
                {editingClient.id ? 'Editar Cliente' : 'Novo Cliente'}
              </h3>
              <button
                onClick={() => setEditingClient(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  value={editingClient.name}
                  onChange={e => setEditingClient({ ...editingClient, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editingClient.email}
                    onChange={e => setEditingClient({ ...editingClient, email: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    value={editingClient.phone}
                    onChange={e => setEditingClient({ ...editingClient, phone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Empresa
                </label>
                <input
                  type="text"
                  value={editingClient.company || ''}
                  onChange={e => setEditingClient({ ...editingClient, company: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={editingClient.status}
                  onChange={e => setEditingClient({ 
                    ...editingClient, 
                    status: e.target.value as Client['status']
                  })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Projetos Vinculados
                </label>
                <select
                  multiple
                  value={editingClient.projects}
                  onChange={e => setEditingClient({
                    ...editingClient,
                    projects: Array.from(e.target.selectedOptions, option => option.value)
                  })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 h-32"
                >
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.title}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                </label>
                <textarea
                  value={editingClient.notes || ''}
                  onChange={e => setEditingClient({ ...editingClient, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingClient(null)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveClient}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Edição Rápida */}
      {quickEditProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-xl mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">{quickEditProject.title}</h3>
              <button
                onClick={() => setQuickEditProject(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Status e Prioridade */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={quickEditProject.status}
                    onChange={e => setQuickEditProject({
                      ...quickEditProject,
                      status: e.target.value as Project['status']
                    })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="backlog">📋 Backlog</option>
                    <option value="todo">📝 A Fazer</option>
                    <option value="in_progress">⚡ Em Progresso</option>
                    <option value="review">👀 Revisão</option>
                    <option value="done">✅ Concluído</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prioridade
                  </label>
                  <select
                    value={quickEditProject.priority}
                    onChange={e => setQuickEditProject({
                      ...quickEditProject,
                      priority: e.target.value as Project['priority']
                    })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">🔵 Baixa</option>
                    <option value="medium">🟡 Média</option>
                    <option value="high">🔴 Alta</option>
                  </select>
                </div>
              </div>
              
              {/* Data de Entrega e Progresso */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data de Entrega
                  </label>
                  <input
                    type="date"
                    value={quickEditProject.due_date?.split('T')[0] || ''}
                    onChange={e => setQuickEditProject({
                      ...quickEditProject,
                      due_date: e.target.value
                    })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Progresso (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={quickEditProject.progress}
                    onChange={e => setQuickEditProject({
                      ...quickEditProject,
                      progress: Number(e.target.value)
                    })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              {/* Lista de Tarefas */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Tarefas
                  </label>
                  <button
                    onClick={handleAddTask}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    + Adicionar Tarefa
                  </button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {quickEditProject.tasks.map((task, index) => (
                    <div key={task.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={e => {
                          const newTasks = [...quickEditProject.tasks];
                          newTasks[index].completed = e.target.checked;
                          setQuickEditProject({
                            ...quickEditProject,
                            tasks: newTasks,
                            progress: Math.round(
                              (newTasks.filter(t => t.completed).length / newTasks.length) * 100
                            )
                          });
                        }}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        value={task.title}
                        onChange={e => {
                          const newTasks = [...quickEditProject.tasks];
                          newTasks[index].title = e.target.value;
                          setQuickEditProject({
                            ...quickEditProject,
                            tasks: newTasks
                          });
                        }}
                        placeholder="Título da tarefa"
                        className="flex-1 px-2 py-1 border rounded focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => {
                          const newTasks = quickEditProject.tasks.filter((_, i) => i !== index);
                          setQuickEditProject({
                            ...quickEditProject,
                            tasks: newTasks,
                            progress: newTasks.length ? Math.round(
                              (newTasks.filter(t => t.completed).length / newTasks.length) * 100
                            ) : 0
                          });
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setQuickEditProject(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleQuickSave}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Admin;