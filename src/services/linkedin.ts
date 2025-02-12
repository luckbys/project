const LINKEDIN_API_URL = 'https://api.linkedin.com/v2';
const LINKEDIN_CLIENT_ID = import.meta.env.VITE_LINKEDIN_CLIENT_ID;
const LINKEDIN_CLIENT_SECRET = import.meta.env.VITE_LINKEDIN_CLIENT_SECRET;
const LINKEDIN_REDIRECT_URI = import.meta.env.VITE_LINKEDIN_REDIRECT_URI;

interface LinkedInTokenResponse {
  access_token: string;
  expires_in: number;
}

interface LinkedInShareContent {
  title?: string;
  text: string;
  imageUrl?: string;
  articleUrl?: string;
}

export class LinkedInService {
  private static accessToken: string | null = null;
  private static expiresAt: number | null = null;

  static async initialize(): Promise<void> {
    // Tentar recuperar token do localStorage
    const savedToken = localStorage.getItem('linkedin_token');
    const savedExpiry = localStorage.getItem('linkedin_expires_at');

    if (savedToken && savedExpiry && Number(savedExpiry) > Date.now()) {
      this.accessToken = savedToken;
      this.expiresAt = Number(savedExpiry);
    }
  }

  static getAuthUrl(): string {
    // Determina se estamos em desenvolvimento ou produção
    const isProduction = window.location.hostname !== 'localhost';
    const redirectUri = isProduction 
      ? 'https://hvokwanpdpfmyvcfeccf.supabase.co/linkedin-callback'
      : 'http://localhost:5173/linkedin-callback';

    const scope = encodeURIComponent('w_member_social r_liteprofile r_emailaddress');
    return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${LINKEDIN_CLIENT_ID}&redirect_uri=${redirectUri}&scope=${scope}`;
  }

  static async handleAuthCode(code: string): Promise<void> {
    // Determina se estamos em desenvolvimento ou produção
    const isProduction = window.location.hostname !== 'localhost';
    const redirectUri = isProduction 
      ? 'https://hvokwanpdpfmyvcfeccf.supabase.co/linkedin-callback'
      : 'http://localhost:5173/linkedin-callback';

    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: LINKEDIN_CLIENT_ID,
        client_secret: LINKEDIN_CLIENT_SECRET,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error('Falha ao obter token do LinkedIn');
    }

    const data: LinkedInTokenResponse = await response.json();
    this.accessToken = data.access_token;
    this.expiresAt = Date.now() + (data.expires_in * 1000);

    // Salvar no localStorage
    localStorage.setItem('linkedin_token', data.access_token);
    localStorage.setItem('linkedin_expires_at', String(this.expiresAt));
  }

  static async shareContent({ title, text, imageUrl, articleUrl }: LinkedInShareContent): Promise<void> {
    if (!this.accessToken) {
      throw new Error('Não autenticado no LinkedIn');
    }

    const payload = {
      author: `urn:li:person:${await this.getUserId()}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: text
          },
          shareMediaCategory: 'NONE',
          media: imageUrl ? [{
            status: 'READY',
            description: {
              text: title || ''
            },
            media: await this.uploadImage(imageUrl),
            title: {
              text: title || ''
            }
          }] : undefined,
          articleUrl
        }
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
      }
    };

    const response = await fetch(`${LINKEDIN_API_URL}/ugcPosts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error('Falha ao compartilhar no LinkedIn');
    }
  }

  private static async getUserId(): Promise<string> {
    const response = await fetch(`${LINKEDIN_API_URL}/me`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Falha ao obter ID do usuário');
    }

    const data = await response.json();
    return data.id;
  }

  private static async uploadImage(imageUrl: string): Promise<string> {
    // Primeiro registra a imagem
    const registerResponse = await fetch(`${LINKEDIN_API_URL}/assets?action=registerUpload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        registerUploadRequest: {
          recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
          owner: `urn:li:person:${await this.getUserId()}`,
          serviceRelationships: [{
            relationshipType: 'OWNER',
            identifier: 'urn:li:userGeneratedContent'
          }]
        }
      })
    });

    const { value } = await registerResponse.json();
    
    // Faz upload da imagem
    const imageResponse = await fetch(imageUrl);
    const imageBlob = await imageResponse.blob();
    
    await fetch(value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl, {
      method: 'PUT',
      body: imageBlob
    });

    return value.asset;
  }
} 