import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Users,
  List,
  Eye,
  Code2
} from 'lucide-react';
import { supabase } from './lib/supabase';
import emailjs from '@emailjs/browser';
import { toast } from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';
import AIChat from './components/AIChat';
import Loading from './components/Loading';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { QRCodeSVG } from 'qrcode.react';
import { createRoot } from 'react-dom/client';
import QRCode from 'qrcode';
import Modal from './components/Modal';
import Clock from './components/Clock';

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
  created_from_quote?: boolean;
  budget?: number;
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
  image_url?: string;
  company_logo?: string; // URL do logo da empresa
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
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

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

type Priority = 'high' | 'medium' | 'low';
const priorityOrder: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

type MessageWithPriority = Message & { priority: Priority };

type QuoteItem = {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
};

type Quote = {
  id: string;
  client_id: string;
  project_type: 'web' | 'mobile' | 'desktop' | 'outros';
  items: QuoteItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  valid_until: string;
  notes?: string;
  created_at: string;
};

// Adicionar novo tipo para filtros de orçamentos
type QuoteFilters = {
  status: 'all' | 'draft' | 'sent' | 'accepted' | 'rejected';
  client: string;
  dateRange: 'all' | 'week' | 'month' | 'quarter';
  search: string;
};

// Adicionar tipo para configurações do sistema
type SystemSettings = {
  theme: 'light' | 'dark';
  language: 'pt-BR' | 'en-US' | 'es-ES';
  projectView: 'kanban' | 'list';
  notifications: boolean;
  emailNotifications: boolean;
  autoSave: boolean;
};

// Adicionar tipo para upload
type ImageType = 'logo' | 'developer';

function Admin() {
  // Mover as declarações de estado para dentro do componente
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    theme: 'light',
    language: 'pt-BR',
    projectView: 'list',
    notifications: true,
    emailNotifications: true,
    autoSave: true
  });

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
  const [projectView, setProjectView] = useState<KanbanView>('list');
  const [draggedProject, setDraggedProject] = useState<Project | null>(null);
  const [quickEditProject, setQuickEditProject] = useState<Project | null>(null);
  const [showProjectModal, setShowProjectModal] = useState(false);

  // Adicionar loading states específicos
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [savingData, setSavingData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Adicionar novos estados
  const [loadingAITasks, setLoadingAITasks] = useState(false);
  const [loadingAIConversion, setLoadingAIConversion] = useState(false);

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

      if (aboutError && aboutError.code !== 'PGRST116') throw aboutError;

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
      const sortedMessages = messagesWithPriority.sort((a: MessageWithPriority, b: MessageWithPriority) => {
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
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (clientsError) throw clientsError;
      setClients(clientsData || []);

      // Fetch quotes (orçamentos)
      const { data: quotesData, error: quotesError } = await supabase
        .from('quotes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (quotesError) throw quotesError;
      setQuotes(quotesData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProject = () => {
    setShowProjectModal(true);
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

  const validateClient = (client: Client) => {
    const errors: string[] = [];
    
    if (!client.name.trim()) errors.push('Nome é obrigatório');
    if (!client.email.trim()) errors.push('Email é obrigatório');
    if (!client.phone.trim()) errors.push('Telefone é obrigatório');
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(client.email)) errors.push('Email inválido');
    
    return errors;
  };

  const handleError = (error: any, context: string) => {
    console.error(`Erro em ${context}:`, error);
    
    if (error?.code === 'PGRST301') {
      toast.error('Sua sessão expirou. Por favor, faça login novamente.');
      supabase.auth.signOut();
      return;
    }
    
    if (error?.code === '23505') {
      toast.error('Este email já está cadastrado para outro cliente');
      return;
    }
    
    toast.error(`Erro ao ${context}`);
  };

  // Sanitizar dados antes de enviar ao servidor
  const sanitizeClient = (client: Client) => {
    return {
      ...client,
      name: client.name.trim(),
      email: client.email.trim().toLowerCase(),
      phone: client.phone.trim(),
      company: client.company?.trim() || null,
      notes: client.notes?.trim() || null
    };
  };

  const handleSaveClient = async () => {
    if (!editingClient) return;
    
    try {
      setSaving(true);
      const sanitizedClient = sanitizeClient(editingClient);
      const clientData = {
        name: sanitizedClient.name,
        email: sanitizedClient.email,
        phone: sanitizedClient.phone,
        company: sanitizedClient.company,
        status: sanitizedClient.status,
        projects: sanitizedClient.projects,
        notes: sanitizedClient.notes,
        user_id: (await supabase.auth.getSession()).data.session?.user.id
      };
      
      if (editingClient.id) {
        // Atualização de cliente existente
        const { error } = await supabase
          .from('clients')
          .update({
            ...clientData
          })
          .eq('id', editingClient.id);
        
        if (error) throw error;
      } else {
        // Inserção de novo cliente
        const { error } = await supabase
          .from('clients')
          .insert([{
            ...clientData
          }])
          .select();
        
        if (error) throw error;
      }
      
      // Recarrega os dados após salvar
      await fetchData();
      setEditingClient(null);
      toast.success('Cliente salvo com sucesso!');
    } catch (error) {
      handleError(error, 'salvar cliente');
    } finally {
      setSaving(false);
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

  // Memoizar funções e valores computados
  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      const matchesSearch = client.name.toLowerCase().includes(clientFilters.search.toLowerCase()) ||
        client.email.toLowerCase().includes(clientFilters.search.toLowerCase()) ||
        client.company?.toLowerCase().includes(clientFilters.search.toLowerCase());
      
      const matchesStatus = clientFilters.status === 'all' || client.status === clientFilters.status;
      
      const matchesProjects = clientFilters.hasProjects === 'all' ||
        (clientFilters.hasProjects === 'yes' && client.projects.length > 0) ||
        (clientFilters.hasProjects === 'no' && client.projects.length === 0);
      
      return matchesSearch && matchesStatus && matchesProjects;
    });
  }, [clients, clientFilters]);

  const handleClientFilter = useCallback((filterType: string, value: string) => {
    setClientFilters(prev => ({ ...prev, [filterType]: value }));
  }, []);

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
      id: '', // ID será gerado pelo Supabase
      name: '',
      email: '',
      phone: '',
      status: 'active',
      projects: [],
      created_at: new Date().toISOString(),
      company: '',
      notes: ''
    });
  };

  // Separar fetchData em funções menores
  const fetchClients = async () => {
    try {
      setLoadingClients(true);
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      
      if (!userId) throw new Error('Usuário não autenticado');
      
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      toast.error('Erro ao carregar clientes');
    } finally {
      setLoadingClients(false);
    }
  };

  const fetchProjects = async () => {
    try {
      setLoadingProjects(true);
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      
      if (!userId) throw new Error('Usuário não autenticado');
      
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Erro ao carregar projetos:', error);
      toast.error('Erro ao carregar projetos');
    } finally {
      setLoadingProjects(false);
    }
  };

  // Função para validar o tipo de arquivo
  const validateFileType = (file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      throw new Error('Formato de arquivo inválido. Use JPG, PNG ou WebP');
    }
  };

  // Função para redimensionar imagem se necessário
  const resizeImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const maxWidth = 800;
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('Contexto 2D não disponível'));
          
          let width = img.width;
          let height = img.height;
          
          if (width > maxWidth) {
            height = (maxWidth * height) / width;
            width = maxWidth;
          }
          
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error('Erro ao converter imagem'));
            },
            'image/jpeg',
            0.85
          );
        };
      };
    });
  };

  // Adicionar tipo para upload
  type ImageType = 'logo' | 'developer';

  // Função para fazer upload de imagens
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: ImageType) => {
    try {
      if (!e.target.files?.[0]) return;
      
      const file = e.target.files[0];
      if (!file.type.includes('image/')) {
        toast.error('Por favor, selecione uma imagem válida');
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        toast.error('A imagem deve ter no máximo 2MB');
        return;
      }

      setUploading(true);
      
      // Definir bucket e caminho baseado no tipo
      const bucket = type === 'logo' ? 'logos' : 'developer-images';
      const fileName = `${type}-${Date.now()}.${file.name.split('.').pop()}`;

      // Upload para o Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      // Atualizar o AboutMe com a nova URL
      const { error: updateError } = await supabase
        .from('about_me')
        .update({
          [type === 'logo' ? 'company_logo' : 'image_url']: publicUrl
        })
        .eq('id', aboutMe?.id);

      if (updateError) throw updateError;

      // Atualizar estado local
      setAboutMe(prev => ({
        ...prev!,
        [type === 'logo' ? 'company_logo' : 'image_url']: publicUrl
      }));

      toast.success(`${type === 'logo' ? 'Logo' : 'Foto'} atualizado com sucesso!`);
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error(`Erro ao atualizar ${type === 'logo' ? 'logo' : 'foto'}`);
    } finally {
      setUploading(false);
    }
  };

  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [activeQuoteStep, setActiveQuoteStep] = useState(0);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [quoteForm, setQuoteForm] = useState<Partial<Quote>>({
    project_type: 'web',
    items: [],
    tax: 0,
    status: 'draft'
  });

  const quoteSteps = [
    { title: 'Informações Básicas', icon: '📋' },
    { title: 'Itens do Orçamento', icon: '📝' },
    { title: 'Revisão', icon: '👀' }
  ];

  const handleCreateQuote = async () => {
    try {
      if (!selectedClient) return;
      
      const { data: { user } } = await supabase.auth.getUser();
      
      const subtotal = quoteForm.items?.reduce((acc, item) => 
        acc + (item.quantity * item.unit_price), 0) || 0;
      
      const total = subtotal + (subtotal * (quoteForm.tax || 0) / 100);
      
      const { error } = await supabase
        .from('quotes')
        .insert({
          ...quoteForm,
          client_id: selectedClient.id,
          user_id: user?.id,
          subtotal,
          total,
          created_at: new Date().toISOString(),
          valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 dias
        });
      
      if (error) throw error;
      
      toast.success('Orçamento criado com sucesso!');
      setShowQuoteModal(false);
      setQuoteForm({
        project_type: 'web',
        items: [],
        tax: 0,
        status: 'draft'
      });
      setActiveQuoteStep(0);
    } catch (error) {
      console.error('Erro ao criar orçamento:', error);
      toast.error('Erro ao criar orçamento');
    }
  };

  const [quotes, setQuotes] = useState<Quote[]>([]);

  // Adicionar função para gerar o PDF
  const generateQuotePDF = async (quote: Quote): Promise<Blob> => {
    try {
      const client = clients.find(c => c.id === quote.client_id);
      if (!client) return;

      // Função para carregar imagem
      const loadImage = (url: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "Anonymous";  // Importante para imagens de outros domínios
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = url;
        });
      };

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 20;

      // Fundo com gradiente
      doc.setFillColor(48, 16, 107);
      doc.rect(0, 0, pageWidth, 80, 'F');
      doc.setFillColor(249, 115, 22);
      doc.rect(pageWidth - 80, 0, 80, 80, 'F');

      // Carregar e adicionar o logo
      if (aboutMe?.company_logo) {
        try {
          const img = await loadImage(aboutMe.company_logo);
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0);
          const imageData = canvas.toDataURL('image/png');
          
          // Calcular proporções para manter o aspect ratio
          const maxWidth = 50;
          const maxHeight = 50;
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > maxWidth) {
              height = height * (maxWidth / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = width * (maxHeight / height);
              height = maxHeight;
            }
          }

          // Posicionar o logo no canto superior esquerdo
          doc.addImage(
            imageData,
            'PNG',
            15, // X: 15mm da margem esquerda
            15, // Y: 15mm do topo
            width,
            height
          );
        } catch (error) {
          console.error('Erro ao carregar logo:', error);
        }
      }

      // Ajustar a posição do título e informações para não sobrepor o logo
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('PROPOSTA / ORÇAMENTO', margin + 70, 35); // Movido mais para a direita

      // Subtítulo (nome do desenvolvedor)
      doc.setFontSize(14);
      doc.text(aboutMe?.developer_name || '', margin + 70, 45); // Movido mais para a direita

      // Informações de contato
      doc.setFontSize(10);
      doc.text([
        aboutMe?.contacts.whatsapp || '',
        'Rua Alegre, 123 - Cidade Brasileira',
        aboutMe?.contacts.email || ''
      ], margin + 70, 55); // Movido mais para a direita

      // Título da seção
      doc.setTextColor(48, 16, 107);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('ESCOPO DO PROJETO / VALORES', margin, 100);

      // Tabela de itens com estilo moderno
      const items = quote.items.map(item => [
        item.description.toUpperCase(),
        `R$${item.total.toFixed(2)}`
      ]);

      autoTable(doc, {
        startY: 120,
        body: items,
        theme: 'plain',
        styles: {
          fontSize: 12,
          textColor: [80, 80, 80],
          cellPadding: 8,
        },
        columnStyles: {
          0: { 
            cellWidth: 'auto',
            fontStyle: 'bold',
            textColor: [100, 100, 200]
          },
          1: { 
            cellWidth: 60,
            halign: 'right',
            textColor: [80, 80, 80]
          }
        },
        margin: { left: margin, right: margin },
        didDrawCell: (data) => {
          if (data.section === 'body') {
            const { x, y, width } = data.cell;
            doc.setDrawColor(230, 230, 240);
            doc.setLineWidth(0.1);
            doc.line(x, y + data.cell.height, x + width, y + data.cell.height);
          }
        }
      });

      // Subtotal
      const finalY = (doc as any).lastAutoTable.finalY + 20;
      doc.setDrawColor(200, 200, 220);
      doc.setLineWidth(0.5);
      doc.line(margin, finalY, pageWidth - margin, finalY);

      doc.setFont('helvetica', 'bold');
      doc.text('SUBTOTAL:', pageWidth - margin - 120, finalY + 15);
      doc.text(`R$ ${quote.subtotal.toFixed(2)}`, pageWidth - margin, finalY + 15, { align: 'right' });

      // Total com desconto
      doc.setFontSize(16);
      doc.setTextColor(34, 197, 94); // Verde
      doc.text('TOTAL:', pageWidth - margin - 120, finalY + 35);
      doc.text(`R$ ${quote.total.toFixed(2)}`, pageWidth - margin, finalY + 35, { align: 'right' });
      doc.setFontSize(10);
      doc.text(`DESCONTO DE ${quote.tax}%`, pageWidth - margin, finalY + 45, { align: 'right' });

      // QR Code
      const qrCodeUrl = `${window.location.origin}/quote-approval/${quote.id}`;
      const qrCodeImage = await QRCode.toDataURL(qrCodeUrl);
      doc.addImage(
        qrCodeImage,
        'PNG',
        pageWidth - margin - 40,
        pageHeight - margin - 40,
        40,
        40
      );

      // Observações
      doc.setTextColor(48, 16, 107);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Observações', margin, pageHeight - margin - 40);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(9);
      doc.text(
        'Este documento não tem validade de registro e é apenas uma forma objetiva e prática de apresentar o orçamento. Entretanto, junto a esse documento, enviamos todo o processo no e-mail.',
        margin,
        pageHeight - margin - 30,
        { maxWidth: pageWidth - (2 * margin) - 50 }
      );

      // Retornar o Blob ao invés de abrir em nova aba
      return doc.output('blob');

    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      throw error;
    }
  };

  // Atualizar a função handleViewQuote
  const handleViewQuote = async (quote: Quote) => {
    try {
      const pdfBlob = await generateQuotePDF(quote);
      
      // Mostrar modal de compartilhamento
      setShareModal({
        isOpen: true,
        quote,
        pdfBlob,
        onWhatsApp: () => shareQuoteViaWhatsApp(quote, pdfBlob),
        onEmail: () => shareQuoteViaEmail(quote, pdfBlob)
      });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF do orçamento');
    }
  };

  // Função para compartilhar via WhatsApp
  const shareQuoteViaWhatsApp = async (quote: Quote, pdfBlob: Blob) => {
    try {
      const client = clients.find(c => c.id === quote.client_id);
      if (!client?.phone) {
        toast.error('Cliente não possui telefone cadastrado');
        return;
      }

      // Formatar número de telefone (remover caracteres não numéricos)
      const phone = client.phone.replace(/\D/g, '');
      
      // Criar mensagem
      const message = `Olá ${client.name}, segue o orçamento solicitado. Por favor, analise e me retorne assim que possível.`;
      
      // Criar URL do WhatsApp
      const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      
      // Abrir WhatsApp em nova aba
      window.open(whatsappUrl, '_blank');
      
      toast.success('WhatsApp aberto com a mensagem');
    } catch (error) {
      console.error('Erro ao compartilhar via WhatsApp:', error);
      toast.error('Erro ao abrir WhatsApp');
    }
  };

  // Função para enviar por email
  const shareQuoteViaEmail = async (quote: Quote, pdfBlob: Blob) => {
    try {
      const client = clients.find(c => c.id === quote.client_id);
      if (!client?.email) {
        toast.error('Cliente não possui email cadastrado');
        return;
      }

      // Fazer upload do PDF para o Supabase Storage
      const fileName = `quote-${quote.id}-${Date.now()}.pdf`;
      
      const { error: uploadError, data } = await supabase.storage
        .from('quotes')
        .upload(fileName, pdfBlob, {
          contentType: 'application/pdf',
          cacheControl: '3600'
        });

      if (uploadError) throw uploadError;

      // Gerar URL pública com expiração de 7 dias
      const { data: { signedUrl } } = await supabase.storage
        .from('quotes')
        .createSignedUrl(fileName, 60 * 60 * 24 * 7); // 7 dias

      if (!signedUrl) throw new Error('Erro ao gerar link do orçamento');

      // Preparar dados para o email
      const emailData = {
        to_email: client.email,
        to_name: client.name,
        from_name: aboutMe?.developer_name || 'Desenvolvedor',
        message: `Olá ${client.name},\n\nSegue o orçamento solicitado no valor total de R$ ${quote.total.toFixed(2)}.\n\nVocê pode acessar o PDF através do link abaixo:\n${signedUrl}\n\nO link expira em 7 dias.\n\nAtenciosamente,\n${aboutMe?.developer_name}`,
        quote_number: quote.id
      };

      // Enviar email usando EmailJS
      const response = await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        emailData,
        EMAILJS_PUBLIC_KEY
      );

      if (response.status === 200) {
        toast.success('Orçamento enviado por email com sucesso!');
      } else {
        throw new Error('Erro ao enviar email');
      }
    } catch (error) {
      console.error('Erro ao enviar por email:', error);
      toast.error('Erro ao enviar email');
    }
  };

  const handleEditQuote = async (quote: Quote) => {
    try {
      setSelectedClient(clients.find(c => c.id === quote.client_id) || null);
      setQuoteForm({
        ...quote,
        items: quote.items.map(item => ({
          ...item,
          total: item.quantity * item.unit_price
        }))
      });
      setShowQuoteModal(true);
    } catch (error) {
      console.error('Erro ao editar orçamento:', error);
      toast.error('Erro ao carregar orçamento para edição');
    }
  };

  const handleDeleteQuote = async (quoteId: string) => {
    try {
      if (!window.confirm('Tem certeza que deseja excluir este orçamento?')) {
        return;
      }
      
      const { error } = await supabase
        .from('quotes')
        .delete()
        .eq('id', quoteId);
      
      if (error) throw error;
      
      // Atualizar a lista de orçamentos
      setQuotes(prev => prev.filter(q => q.id !== quoteId));
      toast.success('Orçamento excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir orçamento:', error);
      toast.error('Erro ao excluir orçamento');
    }
  };

  const [quoteFilters, setQuoteFilters] = useState<QuoteFilters>({
    status: 'all',
    client: 'all',
    dateRange: 'all',
    search: ''
  });

  const filteredQuotes = useMemo(() => {
    return quotes.filter(quote => {
      // Filtro de busca
      if (quoteFilters.search) {
        const searchLower = quoteFilters.search.toLowerCase();
        const clientName = clients.find(c => c.id === quote.client_id)?.name.toLowerCase() || '';
        if (!clientName.includes(searchLower) && 
            !quote.notes?.toLowerCase().includes(searchLower)) {
          return false;
        }
      }
  
      // Filtro de status
      if (quoteFilters.status !== 'all' && quote.status !== quoteFilters.status) {
        return false;
      }
  
      // Filtro de cliente
      if (quoteFilters.client !== 'all' && quote.client_id !== quoteFilters.client) {
        return false;
      }
  
      // Filtro de data
      if (quoteFilters.dateRange !== 'all') {
        const quoteDate = new Date(quote.created_at);
        const now = new Date();
        
        switch (quoteFilters.dateRange) {
          case 'week':
            const weekAgo = new Date(now.setDate(now.getDate() - 7));
            if (quoteDate < weekAgo) return false;
            break;
          case 'month':
            const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
            if (quoteDate < monthAgo) return false;
            break;
          case 'quarter':
            const quarterAgo = new Date(now.setMonth(now.getMonth() - 3));
            if (quoteDate < quarterAgo) return false;
            break;
        }
      }
  
      return true;
    });
  }, [quotes, quoteFilters, clients]);

  async function chamarApiGemini(prompt: string) {
    try {
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });
  
      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Erro ao chamar Gemini API:', error);
      throw error;
    }
  }
  
  async function converterOrcamentoEmProjeto(quote: Quote) {
    try {
      setLoadingAIConversion(true);
      toast.loading('Convertendo orçamento em projeto...', { id: 'ai-conversion' });

      const prompt = `
        Por favor, resuma a seguinte solicitação de orçamento e converta-a em um conjunto de requisitos de sistema.
        Separe os requisitos em:
        1. Funcionalidades Principais,
        2. Requisitos Técnicos Detalhados,
        3. Sugestões de Priorização.
        Formate a resposta como uma lista de tarefas para um quadro Kanban.
        
        Tipo de Projeto: ${quote.project_type}
        Itens do Orçamento:
        ${quote.items.map(item => `- ${item.description}`).join('\n')}
        
        Observações Adicionais:
        ${quote.notes || 'Nenhuma observação adicional'}
      `;

      const respostaGemini = await chamarApiGemini(prompt);

      // Criar novo projeto com referência ao orçamento
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          title: `Projeto - ${clients.find(c => c.id === quote.client_id)?.name}`,
          description: respostaGemini,
          category: quote.project_type,
          status: 'todo',
          priority: 'medium',
          progress: 0,
          assigned_to: quote.client_id,
          tasks: parseGeminiResponse(respostaGemini),
          user_id: (await supabase.auth.getUser()).data.user?.id,
          quote_id: quote.id, // Referência ao orçamento
          budget: quote.total, // Valor total do orçamento
          created_from_quote: true
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Atualizar status do orçamento e adicionar referência ao projeto
      const { error: quoteError } = await supabase
        .from('quotes')
        .update({ 
          status: 'accepted',
          project_id: project.id, // Referência ao projeto criado
          converted_at: new Date().toISOString()
        })
        .eq('id', quote.id);

      if (quoteError) throw quoteError;

      // Atualizar o cliente com o novo projeto
      const { error: clientError } = await supabase
        .from('clients')
        .update({
          projects: [...clients.find(c => c.id === quote.client_id)?.projects || [], project.id]
        })
        .eq('id', quote.client_id);

      if (clientError) throw clientError;

      toast.success('Orçamento convertido em projeto com sucesso!', { id: 'ai-conversion' });
      setActiveTab('projects');
      return project;
    } catch (error) {
      console.error('Erro ao converter orçamento:', error);
      toast.error('Erro ao converter orçamento em projeto', { id: 'ai-conversion' });
      throw error;
    } finally {
      setLoadingAIConversion(false);
    }
  }
  
  function parseGeminiResponse(response: string): Project['tasks'] {
    const tasks: Project['tasks'] = [];
    const lines = response.split('\n');
  
    lines.forEach((line: string) => {
      if (line.trim().startsWith('-') || line.trim().match(/^\d+\./)) {
        tasks.push({
          id: crypto.randomUUID(),
          title: line.replace(/^[-\d.\s]+/, '').trim(),
          completed: false
        });
      }
    });
  
    return tasks;
  }

  // Atualizar a função de gerar tarefas com IA
  async function generateTasksWithAI(description: string) {
    try {
      setLoadingAITasks(true);
      toast.loading('Gerando tarefas com IA...', { id: 'ai-tasks' });

      const prompt = `
        Com base na seguinte descrição de projeto, gere uma lista de tarefas objetivas e práticas.
        Formate cada tarefa em uma linha separada, começando com "-".
        Mantenha as tarefas curtas e acionáveis.

        Descrição do Projeto:
        ${description}
      `;

      const response = await chamarApiGemini(prompt);
      const tasks = response
        .split('\n')
        .filter((line: string) => line.trim().startsWith('-'))
        .map((line: string) => ({
          id: crypto.randomUUID(),
          title: line.replace('-', '').trim(),
          completed: false
        }));

      toast.success('Tarefas geradas com sucesso!', { id: 'ai-tasks' });
      return tasks;
    } catch (error) {
      console.error('Erro ao gerar tarefas:', error);
      toast.error('Erro ao gerar tarefas com IA', { id: 'ai-tasks' });
      return [];
    } finally {
      setLoadingAITasks(false);
    }
  }

  // Função para carregar as configurações do usuário
  const loadSystemSettings = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      
      if (!userId) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSystemSettings(data.settings);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast.error('Erro ao carregar configurações');
    }
  };

  // Função para salvar as configurações
  const saveSystemSettings = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      
      if (!userId) {
        throw new Error('Usuário não autenticado');
      }

      const { error } = await supabase
        .from('system_settings')
        .upsert({
          user_id: userId,
          settings: systemSettings,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      // Aplicar configurações
      applySystemSettings(systemSettings);
      
      toast.success('Configurações salvas com sucesso!');
      setShowSettingsModal(false);
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast.error('Erro ao salvar configurações');
    }
  };

  // Função para aplicar as configurações
  const applySystemSettings = (settings: SystemSettings) => {
    // Aplicar tema
    document.documentElement.classList.toggle('dark', settings.theme === 'dark');
    
    // Aplicar visualização padrão de projetos
    setProjectView(settings.projectView);
    
    // Configurar notificações
    if (settings.notifications) {
      // Solicitar permissão para notificações do navegador
      if ('Notification' in window) {
        Notification.requestPermission();
      }
    }
  };

  // Carregar configurações ao iniciar
  useEffect(() => {
    loadSystemSettings();
  }, []);

  // Atualizar o modal de configurações
  const handleSaveSettings = async () => {
    await saveSystemSettings();
  };

  // Adicionar estado para o modal de compartilhamento
  const [shareModal, setShareModal] = useState<{
    isOpen: boolean;
    quote: Quote | null;
    pdfBlob: Blob | null;
    onWhatsApp: () => void;
    onEmail: () => void;
  }>({
    isOpen: false,
    quote: null,
    pdfBlob: null,
    onWhatsApp: () => {},
    onEmail: () => {}
  });

  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Buscar dados do usuário atual
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    
    getUser();
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white p-8 rounded-2xl shadow-xl">
          <Loading 
            size="lg"
            color="blue"
            text="Carregando..."
          />
        </div>
      </div>
    );
  }

  console.log('Estado atual das mensagens:', messages);

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <Toaster position="top-right" />
      
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg">
        {/* Perfil no topo da sidebar */}
        <div className="p-6 border-b">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              {aboutMe?.image_url ? (
                <img 
                  src={aboutMe.image_url} 
                  alt="Perfil"
                  className="w-12 h-12 rounded-full object-cover border-2 border-blue-500"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <User2 className="w-6 h-6 text-blue-600" />
                </div>
              )}
              <div>
                <h2 className="font-semibold text-gray-900">
                  {aboutMe?.developer_name || 'Seu Nome'}
                </h2>
                <p className="text-sm text-gray-500">Desenvolvedor Full Stack</p>
              </div>
            </div>
            <button
              onClick={() => setShowSettingsModal(true)}
              className="text-gray-600 hover:text-gray-800 transition-colors"
              title="Configurações do Sistema"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-center text-sm">
            <div className="bg-gray-50 p-2 rounded">
              <div className="font-medium text-blue-600">
                {aboutMe?.stats.years_experience || 0}+
              </div>
              <div className="text-gray-500 text-xs">Anos Exp.</div>
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <div className="font-medium text-blue-600">
                {aboutMe?.stats.projects_completed || 0}
              </div>
              <div className="text-gray-500 text-xs">Projetos</div>
            </div>
          </div>
        </div>

        {/* Menu de Navegação */}
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
            onClick={() => setActiveTab('quotes')}
            className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-colors ${
              activeTab === 'quotes' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <List className="w-5 h-5" />
            Orçamentos
          </button>
        </nav>

        {/* Botão de Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-6 py-3 text-left text-red-600 hover:bg-red-50 transition-colors mt-6"
        >
          <LogOut className="w-5 h-5" />
          Sair
        </button>
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1">
        {/* Header com Relógio */}
        <div className="bg-white shadow-sm">
          <div className="container mx-auto px-6 py-4">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-800">
                Dashboard
              </h1>
              <Clock />
            </div>
          </div>
        </div>

        <div className="p-8">
          {/* Conteúdo das tabs */}
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
                    user={user}
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
                        className={`
                          px-3 py-1 rounded-md transition-colors
+                         flex items-center gap-2
                          ${projectView === 'kanban' 
                            ? 'bg-white shadow text-blue-600' 
                            : 'text-gray-600 hover:text-gray-800'
                          }
                        `}
                      >
+                       <FolderKanban className="w-4 h-4" />
                        Kanban
                      </button>
                      <button
                        onClick={() => setProjectView('list')}
                        className={`
                          px-3 py-1 rounded-md transition-colors
+                         flex items-center gap-2
                          ${projectView === 'list'
                            ? 'bg-white shadow text-blue-600'
                            : 'text-gray-600 hover:text-gray-800'
                          }
                        `}
                      >
+                       <List className="w-4 h-4" />
                        Lista
                      </button>
                    </div>
                    <button
                      onClick={() => {
                          setEditingProject({ 
                            id: '', 
                            title: '', 
                            description: '', 
                            image: '', 
                            tags: [], 
                            link: '',
                            category: 'web',
                            status: 'todo',
                            priority: 'medium',
                            progress: 0,
                            tasks: []
                          });
                          setShowProjectModal(true);
                        }}
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
                <div className={`
                  grid
                  grid-cols-1 
                  sm:grid-cols-2 
                  lg:grid-cols-3 
                  xl:grid-cols-4
                  gap-6
                `}>
                  {filterProjects(projects).map(project => (
                    <div key={project.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
                      <div className="relative">
                        {project.created_from_quote && (
                          <div className="absolute top-2 right-2 bg-green-100 text-green-600 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            Orçamento Aprovado
                          </div>
                        )}
                        <img
                          src={project.image}
                          alt={project.title}
                          className="w-full h-52 object-cover"
                        />
                      </div>
                      {project.budget && (
                        <div className="px-6 py-2 bg-gray-50 border-b text-right">
                          <span className="text-sm text-gray-600">Orçamento:</span>
                          <span className="ml-2 font-medium">R$ {project.budget.toFixed(2)}</span>
                        </div>
                      )}
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
                        <p className="text-gray-600 mb-4 line-clamp-2" title={project.description}>
                          {project.description}
                        </p>
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

                  {/* Upload de Imagem */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Foto do Desenvolvedor
                    </label>
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        {previewImage && (
                          <div className="absolute -left-16 top-0 w-14 h-14 rounded-full overflow-hidden border-2 border-blue-500">
                            <img 
                              src={previewImage} 
                              alt="Preview" 
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, 'developer')}
                          disabled={uploading}
                          className="hidden"
                          id="developer-image"
                        />
                        <label
                          htmlFor="developer-image"
                          className={`
                            flex items-center gap-2 px-4 py-2 rounded-lg 
                            border-2 border-dashed transition-colors
                            ${uploading 
                              ? 'border-gray-300 bg-gray-50 cursor-not-allowed' 
                              : 'border-blue-300 hover:border-blue-400 cursor-pointer'
                            }
                          `}
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
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
                            />
                          </svg>
                          {uploading ? 'Enviando...' : 'Escolher imagem'}
                        </label>
                    </div>
                      {uploading && (
                        <Loading size="sm" color="blue" />
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      Formatos aceitos: JPG, PNG ou WebP. Tamanho máximo: 5MB
                    </p>
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
                    {filteredClients.length} clientes encontrados
                  </div>
                </div>
              </div>
              
              {/* Lista de Clientes */}
              <div className="grid gap-6">
                {filteredClients.map(client => (
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
                          <button
                        onClick={() => {
                          setSelectedClient(client);
                          setShowQuoteModal(true);
                        }}
                            className="text-blue-600 hover:text-blue-700"
                        title="Criar Orçamento"
                      >
                        <svg 
                          className="w-5 h-5" 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" 
                          />
                        </svg>
                          </button>
                        </div>
                      </div>
                ))}
                    </div>
            </div>
          )}

          {activeTab === 'quotes' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Orçamentos</h2>
              </div>
              
              {/* Filtros */}
              <div className="bg-white p-4 rounded-lg shadow space-y-4">
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <input
                      type="text"
                      placeholder="Buscar orçamentos..."
                      value={quoteFilters.search}
                      onChange={e => setQuoteFilters(prev => ({ ...prev, search: e.target.value }))}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <select
                    value={quoteFilters.status}
                    onChange={e => setQuoteFilters(prev => ({ ...prev, status: e.target.value as QuoteFilters['status'] }))}
                    className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Todos Status</option>
                    <option value="draft">📝 Rascunho</option>
                    <option value="sent">📤 Enviado</option>
                    <option value="accepted">✅ Aceito</option>
                    <option value="rejected">❌ Rejeitado</option>
                  </select>
                  
                  <select
                    value={quoteFilters.client}
                    onChange={e => setQuoteFilters(prev => ({ ...prev, client: e.target.value }))}
                    className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Todos Clientes</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                  </select>
                  
                  <select
                    value={quoteFilters.dateRange}
                    onChange={e => setQuoteFilters(prev => ({ ...prev, dateRange: e.target.value as QuoteFilters['dateRange'] }))}
                    className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Todas Datas</option>
                    <option value="week">Última Semana</option>
                    <option value="month">Último Mês</option>
                    <option value="quarter">Último Trimestre</option>
                  </select>
                </div>
              </div>
              
              {/* Lista de Orçamentos */}
              <div className="grid gap-6">
                {filteredQuotes.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Nenhum orçamento encontrado
                  </div>
                ) : (
                  filteredQuotes.map(quote => (
                    <div key={quote.id} className="bg-white rounded-lg shadow-lg p-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-xl font-semibold">
                            {clients.find(c => c.id === quote.client_id)?.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-sm px-2 py-1 rounded-full ${
                              quote.status === 'draft' ? 'bg-gray-100 text-gray-600' :
                              quote.status === 'sent' ? 'bg-blue-100 text-blue-600' :
                              quote.status === 'accepted' ? 'bg-green-100 text-green-600' :
                              'bg-red-100 text-red-600'
                            }`}>
                              {quote.status === 'draft' ? '📝 Rascunho' :
                               quote.status === 'sent' ? '📤 Enviado' :
                               quote.status === 'accepted' ? '✅ Aceito' :
                               '❌ Rejeitado'}
                            </span>
                            <span className="text-sm text-gray-500">
                              {new Date(quote.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">
                            R$ {quote.total.toFixed(2)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {quote.items.length} itens
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <div className="text-sm font-medium text-gray-700">Tipo de Projeto</div>
                        <div className="text-gray-600">
                          {quote.project_type === 'web' ? '💻 Web' :
                           quote.project_type === 'mobile' ? '📱 Mobile' :
                           quote.project_type === 'desktop' ? '🖥️ Desktop' :
                           '🔧 Outros'}
                        </div>
                      </div>
                      
                      {quote.notes && (
                        <div className="mt-4 text-gray-600 text-sm">
                          {quote.notes}
                </div>
              )}
                      
                      <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
                        <button
                          onClick={() => handleViewQuote(quote)}
                          className="text-blue-600 hover:text-blue-700"
                          title="Visualizar"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleEditQuote(quote)}
                          className="text-blue-600 hover:text-blue-700"
                          title="Editar"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteQuote(quote.id)}
                          className="text-red-600 hover:text-red-700"
                          title="Excluir"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => converterOrcamentoEmProjeto(quote)}
                          className={`text-green-600 hover:text-green-700 transition-colors ${
                            loadingAIConversion ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          disabled={loadingAIConversion}
                          title="Converter em Projeto"
                        >
                          {loadingAIConversion ? (
                            <Loading size="sm" color="blue" />
                          ) : (
                            <Code2 className="w-5 h-5" />
                          )}
                        </button>
            </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
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
                  disabled={saving}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {saving ? (
                    <div className="flex items-center gap-2">
                      <Loading size="sm" color="white" />
                      <span>Salvando...</span>
              </div>
                  ) : 'Salvar'}
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
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        if (!quickEditProject?.description) {
                          toast.error('Adicione uma descrição ao projeto primeiro');
                          return;
                        }
                        const aiTasks = await generateTasksWithAI(quickEditProject.description);
                        if (aiTasks.length > 0) {
                          setQuickEditProject(prev => prev ? {
                            ...prev,
                            tasks: [...prev.tasks, ...aiTasks]
                          } : null);
                          toast.success('Tarefas geradas com sucesso!');
                        }
                      }}
                      className={`text-purple-600 hover:text-purple-700 transition-colors ${
                        loadingAITasks ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      disabled={loadingAITasks}
                      title="Gerar tarefas com IA"
                    >
                      {loadingAITasks ? (
                        <Loading size="sm" color="blue" />
                      ) : (
                        <svg 
                          className="w-5 h-5" 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                          />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={handleAddTask}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      + Adicionar Tarefa
                    </button>
                  </div>
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

      {/* Modal de Novo/Editar Projeto */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">
                {editingProject?.id ? 'Editar Projeto' : 'Novo Projeto'}
              </h3>
              <button
                onClick={() => {
                  setShowProjectModal(false);
                  setEditingProject(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título
                </label>
                <input
                  type="text"
                  value={editingProject?.title || ''}
                  onChange={e => setEditingProject(prev => prev ? {
                    ...prev,
                    title: e.target.value
                  } : null)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <textarea
                  value={editingProject?.description || ''}
                  onChange={e => setEditingProject(prev => prev ? {
                    ...prev,
                    description: e.target.value
                  } : null)}
                  rows={4}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoria
                  </label>
                  <select
                    value={editingProject?.category || 'web'}
                    onChange={e => setEditingProject(prev => prev ? {
                      ...prev,
                      category: e.target.value as Project['category']
                    } : null)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="web">💻 Web</option>
                    <option value="mobile">📱 Mobile</option>
                    <option value="desktop">🖥️ Desktop</option>
                    <option value="outros">🔧 Outros</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Link do Projeto
                  </label>
                  <input
                    type="url"
                    value={editingProject?.link || ''}
                    onChange={e => setEditingProject(prev => prev ? {
                      ...prev,
                      link: e.target.value
                    } : null)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags
                </label>
                <input
                  type="text"
                  value={editingProject?.tags.join(', ') || ''}
                  onChange={e => setEditingProject(prev => prev ? {
                    ...prev,
                    tags: e.target.value.split(',').map(tag => tag.trim())
                  } : null)}
                  placeholder="Separe as tags por vírgula"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Imagem do Projeto
                </label>
                <input
                  type="url"
                  value={editingProject?.image || ''}
                  onChange={e => setEditingProject(prev => prev ? {
                    ...prev,
                    image: e.target.value
                  } : null)}
                  placeholder="URL da imagem"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowProjectModal(false);
                    setEditingProject(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await handleSaveProject();
                    setShowProjectModal(false);
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Orçamento */}
      {showQuoteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">
                Novo Orçamento - {selectedClient?.name}
              </h3>
              <button
                onClick={() => setShowQuoteModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Breadcrumb */}
            <div className="flex items-center justify-center mb-8">
              {quoteSteps.map((step, index) => (
                <React.Fragment key={step.title}>
                  <div
                    className={`flex items-center ${
                      index <= activeQuoteStep ? 'text-blue-600' : 'text-gray-400'
                    }`}
                  >
                    <span className="w-8 h-8 rounded-full border-2 flex items-center justify-center font-medium">
                      {step.icon}
                    </span>
                    <span className="ml-2">{step.title}</span>
                  </div>
                  {index < quoteSteps.length - 1 && (
                    <div className={`w-16 h-1 mx-4 ${
                      index < activeQuoteStep ? 'bg-blue-600' : 'bg-gray-200'
                    }`} />
                  )}
                </React.Fragment>
              ))}
            </div>
            
            {/* Conteúdo do Step */}
            <div className="mb-8">
              {activeQuoteStep === 0 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo de Projeto
                    </label>
                    <select
                      value={quoteForm.project_type}
                      onChange={e => setQuoteForm(prev => ({
                        ...prev,
                        project_type: e.target.value as Quote['project_type']
                      }))}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="web">💻 Web</option>
                      <option value="mobile">📱 Mobile</option>
                      <option value="desktop">🖥️ Desktop</option>
                      <option value="outros">🔧 Outros</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Observações
                    </label>
                    <textarea
                      value={quoteForm.notes || ''}
                      onChange={e => setQuoteForm(prev => ({
                        ...prev,
                        notes: e.target.value
                      }))}
                      rows={4}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
              
              {activeQuoteStep === 1 && (
                <div className="space-y-4">
                  <div className="flex justify-end">
                      <button
                      onClick={() => setQuoteForm(prev => ({
                        ...prev,
                        items: [...(prev.items || []), {
                          description: '',
                          quantity: 1,
                          unit_price: 0,
                          total: 0
                        }]
                      }))}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      + Adicionar Item
                      </button>
                  </div>
                  
                  {quoteForm.items?.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-4 items-start">
                      <div className="col-span-6">
                        <input
                          type="text"
                          value={item.description}
                          onChange={e => {
                            const newItems = [...(quoteForm.items || [])];
                            newItems[index].description = e.target.value;
                            setQuoteForm(prev => ({ ...prev, items: newItems }));
                          }}
                          placeholder="Descrição do item"
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={e => {
                            const newItems = [...(quoteForm.items || [])];
                            newItems[index].quantity = Number(e.target.value);
                            newItems[index].total = newItems[index].quantity * newItems[index].unit_price;
                            setQuoteForm(prev => ({ ...prev, items: newItems }));
                          }}
                          min="1"
                          placeholder="Qtd"
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          value={item.unit_price}
                          onChange={e => {
                            const newItems = [...(quoteForm.items || [])];
                            newItems[index].unit_price = Number(e.target.value);
                            newItems[index].total = newItems[index].quantity * newItems[index].unit_price;
                            setQuoteForm(prev => ({ ...prev, items: newItems }));
                          }}
                          min="0"
                          step="0.01"
                          placeholder="Valor Unit."
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="col-span-1">
                        <div className="px-3 py-2 text-gray-700">
                          R$ {(item.quantity * item.unit_price).toFixed(2)}
                        </div>
                      </div>
                      <div className="col-span-1">
                        <button
                          onClick={() => {
                            const newItems = quoteForm.items?.filter((_, i) => i !== index);
                            setQuoteForm(prev => ({ ...prev, items: newItems }));
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  <div className="flex justify-end gap-8 items-center pt-4 border-t">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Taxa (%)
                      </label>
                      <input
                        type="number"
                        value={quoteForm.tax}
                        onChange={e => setQuoteForm(prev => ({
                          ...prev,
                          tax: Number(e.target.value)
                        }))}
                        min="0"
                        max="100"
                        className="w-24 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">Subtotal</div>
                      <div className="text-lg font-medium">
                        R$ {quoteForm.items?.reduce((acc, item) => 
                          acc + (item.quantity * item.unit_price), 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {activeQuoteStep === 2 && (
                <div className="space-y-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Resumo do Orçamento</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Cliente:</span>
                        <span className="font-medium">{selectedClient?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tipo de Projeto:</span>
                        <span className="font-medium">{quoteForm.project_type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total de Itens:</span>
                        <span className="font-medium">{quoteForm.items?.length || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Taxa:</span>
                        <span className="font-medium">{quoteForm.tax}%</span>
                      </div>
                      <div className="flex justify-between text-lg font-medium">
                        <span>Valor Total:</span>
                        <span>R$ {(
                          (quoteForm.items?.reduce((acc, item) => 
                            acc + (item.quantity * item.unit_price), 0) || 0) * 
                          (1 + (quoteForm.tax || 0) / 100)
                        ).toFixed(2)}</span>
                      </div>
                    </div>
            </div>
          </div>
        )}
            </div>
            
            {/* Botões de Navegação */}
            <div className="flex justify-between">
              <button
                onClick={() => setActiveQuoteStep(prev => Math.max(0, prev - 1))}
                className={`px-4 py-2 text-gray-600 hover:text-gray-800 ${
                  activeQuoteStep === 0 ? 'invisible' : ''
                }`}
              >
                Voltar
              </button>
              <button
                onClick={() => {
                  if (activeQuoteStep === quoteSteps.length - 1) {
                    handleCreateQuote();
                  } else {
                    setActiveQuoteStep(prev => Math.min(quoteSteps.length - 1, prev + 1));
                  }
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {activeQuoteStep === quoteSteps.length - 1 ? 'Criar Orçamento' : 'Próximo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Configurações do Sistema */}
      {showSettingsModal && (
        <Modal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)}>
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">Configurações do Sistema</h3>
              <button onClick={() => setShowSettingsModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Logo Upload Section */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Logo da Empresa
              </label>
              <div className="flex items-center gap-4">
                {aboutMe?.company_logo && (
                  <div className="relative w-32 h-32">
                    <img 
                      src={aboutMe.company_logo} 
                      alt="Logo preview" 
                      className="w-full h-full object-contain border rounded-lg"
                    />
                    <button
                      onClick={() => {
                        setAboutMe(prev => ({ ...prev, company_logo: '' }));
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
                <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400">
                  <Plus size={24} className="text-gray-400" />
                  <span className="text-sm text-gray-500 mt-2">Upload Logo</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, 'logo')}
                    disabled={uploading}
                  />
                </label>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Recomendado: PNG ou JPG, máximo 2MB
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tema</label>
                <select 
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={systemSettings.theme}
                  onChange={e => setSystemSettings(s => ({ ...s, theme: e.target.value as 'light' | 'dark' }))}
                >
                  <option value="light">🌞 Claro</option>
                  <option value="dark">🌙 Escuro</option>
                </select>
              </div>

              {/* ... outros campos existentes ... */}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar Configurações'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de Compartilhamento */}
      {shareModal.isOpen && (
        <Modal
          isOpen={shareModal.isOpen}
          onClose={() => setShareModal(prev => ({ ...prev, isOpen: false }))}
        >
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Compartilhar Orçamento</h3>
            
            <div className="space-y-4">
              <button
                onClick={() => {
                  shareModal.onWhatsApp();
                  setShareModal(prev => ({ ...prev, isOpen: false }));
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM16.64 15.55C16.38 16.07 15.54 16.5 14.86 16.5C14.18 16.5 13.5 16.29 12 15.5C10.5 14.71 9.82 14.5 9.14 14.5C8.46 14.5 7.62 14.93 7.36 15.45C7.1 15.97 7.07 16.78 7.97 17.21C8.87 17.64 9.86 17.86 11 17.86C12.14 17.86 13.13 17.64 14.03 17.21C14.93 16.78 14.9 15.97 14.64 15.45Z"/>
              </svg>
                Enviar via WhatsApp
              </button>

              <button
                onClick={() => {
                  shareModal.onEmail();
                  setShareModal(prev => ({ ...prev, isOpen: false }));
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM20 8L12 13L4 8V6L12 11L20 6V8Z"/>
              </svg>
                Enviar por Email
              </button>

              <button
                onClick={() => {
                  if (shareModal.pdfBlob) {
                    window.open(URL.createObjectURL(shareModal.pdfBlob));
                  }
                  setShareModal(prev => ({ ...prev, isOpen: false }));
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 19H5V5H19M19 3H5C3.89 3 3 3.89 3 5V19C3 20.1 3.89 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.89 20.1 3 19 3ZM17 11H7V13H17V11Z"/>
              </svg>
                Abrir PDF
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default Admin;