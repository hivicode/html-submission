// Instagram API Integration
// This file handles automatic Instagram post updates

class InstagramAPI {
  constructor(config) {
    this.config = config;
    this.accessToken = config.api.accessToken;
    this.userId = config.api.userId;
    this.cache = new Map();
    this.apiCallCount = 0;
    this.lastResetDate = new Date().toDateString();
    this.onQuotaUpdate = null; // Callback untuk update UI
  }

  // Initialize with Instagram API
  async initialize() {
    try {
      if (!this.config.api.enabled) {
        console.log('Instagram API is disabled');
        return false;
      }

      // For RapidAPI, we don't need access token
      if (this.config.api.type === 'third_party') {
        if (!this.config.api.rapidApiKey) {
          console.error('RapidAPI key is required for third-party service');
          return false;
        }
        console.log('Instagram RapidAPI initialized successfully');
        return true;
      }

      // For official Instagram APIs, access token is required
      if (!this.accessToken) {
        console.error('Instagram access token is required for official APIs');
        return false;
      }

      console.log('Instagram API initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Instagram API:', error);
      return false;
    }
  }

  // Fetch latest post from Instagram
  async fetchLatestPost() {
    try {
      // Check if date has changed to reset counter
      const currentDate = new Date().toDateString();
      if (currentDate !== this.lastResetDate) {
        this.apiCallCount = 0;
        this.lastResetDate = currentDate;
        console.log('🔄 New day, API call counter reset');
      }
      
      // Check API quota (24 calls per day for 1-hour updates)
      if (this.apiCallCount >= 24) {
        console.log('⚠️ API quota reached (24/24 calls today)');
        console.log('ℹ️ Using cached data or fallback');
        return this.getCachedOrFallbackData();
      }
      
      console.log(`📊 API calls today: ${this.apiCallCount}/24`);
      // Update UI dengan status kuota
      this.updateQuotaUI();
      console.log('🔍 Starting to fetch latest Instagram post...');
      console.log('📋 API Config:', {
        enabled: this.config.api.enabled,
        type: this.config.api.type,
        username: this.config.api.username,
        hasRapidApiKey: !!this.config.api.rapidApiKey
      });

      // Check cache first
      const cacheKey = 'latest_post';
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.config.autoUpdate.cacheDuration) {
        console.log('✅ Using cached Instagram post');
        return cached.data;
      }

      let postData = null;

      switch (this.config.api.type) {
        case 'basic_display':
          console.log('🔄 Using Basic Display API');
          postData = await this.fetchBasicDisplay();
          break;
        case 'graph_api':
          console.log('🔄 Using Graph API');
          postData = await this.fetchGraphAPI();
          break;
        case 'third_party':
          console.log('🔄 Using Third-Party API (RapidAPI)');
          this.apiCallCount++;
          console.log(`📊 API call #${this.apiCallCount}/24`);
          // Update UI setelah API call
          this.updateQuotaUI();
          postData = await this.fetchThirdParty();
          break;
        default:
          console.error('❌ Unknown API type:', this.config.api.type);
          return null;
      }

      if (postData) {
        console.log('✅ Successfully fetched post data:', {
          title: postData.title,
          likes: postData.likes,
          imagesCount: postData.images?.length || 0
        });
        // Cache the result
        this.cache.set(cacheKey, {
          data: postData,
          timestamp: Date.now()
        });
      } else {
        console.warn('⚠️ No post data returned from API');
      }

      return postData;
    } catch (error) {
      console.error('❌ Error fetching latest Instagram post:', error);
      return null;
    }
  }

  // Instagram Basic Display API
  async fetchBasicDisplay() {
    const response = await fetch(
      `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&access_token=${this.accessToken}&limit=${this.config.autoUpdate.maxPosts}`
    );
    
    if (!response.ok) {
      throw new Error(`Instagram API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
      const post = data.data[0];
      return this.formatPostData(post);
    }
    
    return null;
  }

  // Instagram Graph API
  async fetchGraphAPI() {
    const response = await fetch(
      `https://graph.facebook.com/v12.0/${this.userId}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&access_token=${this.accessToken}&limit=${this.config.autoUpdate.maxPosts}`
    );
    
    if (!response.ok) {
      throw new Error(`Instagram Graph API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
      const post = data.data[0];
      return this.formatPostData(post);
    }
    
    return null;
  }

  // Third-party service (RapidAPI)
  async fetchThirdParty() {
    try {
      console.log('🚀 Starting RapidAPI fetch...');
      console.log('🔑 RapidAPI Key:', this.config.api.rapidApiKey ? '✅ Present' : '❌ Missing');
      console.log('👤 Username:', this.config.api.username);

      // Use only feeds endpoint for posts
      const endpoints = [
        {
          url: `https://instagram-bulk-profile-scrapper.p.rapidapi.com/clients/api/ig/feeds?ig=${this.config.api.username}&corsEnabled=false`,
          host: 'instagram-bulk-profile-scrapper.p.rapidapi.com',
          type: 'feeds'
        }
      ];

      let postData = null;
      
      // Retry mechanism with exponential backoff (limited for API quota)
      const maxRetries = 1;
      const baseDelay = 10000; // 10 seconds
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        console.log(`🔄 Attempt ${attempt}/${maxRetries}`);
        
        try {
          postData = await this.fetchWithRetry(endpoints, attempt);
          if (postData) {
            console.log(`✅ Success on attempt ${attempt}`);
            break;
          }
        } catch (error) {
          console.log(`❌ Attempt ${attempt} failed:`, error.message);
          
          if (attempt < maxRetries) {
            const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
            console.log(`⏳ Waiting ${delay/1000} seconds before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      

      

      
      return postData;
      
      console.error('❌ All RapidAPI endpoints failed');
      throw new Error('All RapidAPI endpoints failed');
    } catch (error) {
      console.error('❌ RapidAPI Error:', error);
      return null;
    }
  }

  // Helper function for retry mechanism
  async fetchWithRetry(endpoints, attempt) {
    for (const endpoint of endpoints) {
      try {
        console.log(`🔄 Trying RapidAPI endpoint: ${endpoint.host} (${endpoint.type}) - Attempt ${attempt}`);
        console.log(`📡 URL: ${endpoint.url}`);
        
        const response = await fetch(endpoint.url, {
          headers: {
            'X-RapidAPI-Key': this.config.api.rapidApiKey,
            'X-RapidAPI-Host': endpoint.host
          }
        });
        
        console.log(`📊 Response status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log('📦 RapidAPI response data:', data);
          
          // Handle post data (feeds)
          let post = null;
          
          if (data.items && data.items.length > 0) {
            post = data.items[0];
          } else if (data.response && data.response.posts && data.response.posts.length > 0) {
            post = data.response.posts[0];
          } else if (data.response && data.response.feeds && data.response.feeds.length > 0) {
            post = data.response.feeds[0];
          } else if (data.data && data.data.length > 0) {
            post = data.data[0];
          } else if (data.posts && data.posts.length > 0) {
            post = data.posts[0];
          } else if (data.feeds && data.feeds.length > 0) {
            post = data.feeds[0];
          }
          
          if (post) {
            console.log('✅ Found post data');
            return this.formatThirdPartyData(post, endpoint.host);
          }
        } else {
          console.error(`❌ Response not OK: ${response.status} ${response.statusText}`);
          if (response.status === 429) {
            console.log('⚠️ Rate limit hit, will retry later');
            throw new Error('Rate limit exceeded');
          }
        }
      } catch (error) {
        console.warn(`⚠️ Failed to fetch from ${endpoint.host}:`, error);
        if (error.message === 'Rate limit exceeded') {
          throw error; // Re-throw rate limit errors for retry
        }
        continue;
      }
    }
    return null;
  }

  // Update quota UI
  updateQuotaUI() {
    const quotaInfo = this.getQuotaInfo();
    if (this.onQuotaUpdate) {
      this.onQuotaUpdate(quotaInfo);
    }
  }

  // Get quota information
  getQuotaInfo() {
    const totalQuota = 100; // RapidAPI total quota
    const dailyLimit = 24; // Our daily limit (1-hour updates)
    const used = this.apiCallCount;
    const remaining = dailyLimit - used;
    const percentage = (used / dailyLimit) * 100;
    
    return {
      used,
      remaining,
      totalQuota,
      dailyLimit,
      percentage,
      isQuotaReached: used >= dailyLimit
    };
  }

  // Set callback for quota updates
  setQuotaUpdateCallback(callback) {
    this.onQuotaUpdate = callback;
  }

  // Get cached data or fallback when API quota is reached
  getCachedOrFallbackData() {
    // Check cache first
    const cacheKey = 'latest_post';
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log('✅ Using cached data (API quota reached)');
      return cached.data;
    }
    
    // Return fallback data
    console.log('ℹ️ Using fallback data (no cache available)');
    return {
      emoji: "🎉",
      title: "NewJeans Day",
      subtitle: "3rd Anniversary",
      gradient: "from-purple-400 via-pink-400 to-orange-400",
      likes: "352.8K",
      comments: "2.6K",
      timestamp: "7 hours ago",
      caption: "[NewJeans Day] NewJeans Debut 3rd Anniversary D-3 ✅ NewJeans Day On-Air #NewJeans #뉴진스 #NewJeansDay #NewJeans_3rd_Anniversary",
      images: [
        {
          type: "image",
          url: "img/home/NJ_Supernatural_36.jpg",
          alt: "NewJeans Supernatural"
        }
      ],
      carousel: {
        autoPlay: false,
        interval: 3000,
        showIndicators: true,
        showArrows: false
      }
    };
  }

  // Format Instagram API response to match our widget format
  formatPostData(apiData) {
    // Handle carousel albums
    let images = [];
    if (apiData.media_type === 'CAROUSEL_ALBUM' && apiData.children) {
      images = apiData.children.data.map(child => ({
        type: 'image',
        url: child.media_url || child.thumbnail_url,
        alt: this.extractTitle(apiData.caption) || 'NewJeans'
      }));
    } else if (apiData.media_url) {
      images = [{
        type: 'image',
        url: apiData.media_url || apiData.thumbnail_url,
        alt: this.extractTitle(apiData.caption) || 'NewJeans'
      }];
    }

    return {
      emoji: this.getEmojiFromCaption(apiData.caption),
      title: this.extractTitle(apiData.caption),
      subtitle: this.extractSubtitle(apiData.caption),
      gradient: this.getGradientFromType(apiData.media_type),
      likes: this.formatNumber(apiData.like_count || 0),
      caption: apiData.caption || '',
      comments: this.formatNumber(apiData.comments_count || 0),
      timestamp: this.getRelativeTime(apiData.timestamp),
      mediaUrl: apiData.media_url || apiData.thumbnail_url,
      permalink: apiData.permalink,
      mediaType: apiData.media_type,
      // Carousel support
      images: images,
      carousel: {
        autoPlay: true,
        interval: 3000,
        showIndicators: true,
        showArrows: true
      }
    };
  }

  formatThirdPartyData(apiData, host) {
    console.log('🔧 Formatting third-party data:', apiData);
    console.log('🔧 API data keys:', Object.keys(apiData));
    
    // Handle the new Instagram API response format
    let imageUrl = null;
    let caption = '';
    let likes = 0;
    let comments = 0;
    let timestamp = null;
    let permalink = '';
    let mediaType = 'IMAGE';
    
    // Extract caption from the actual Instagram API structure
    if (apiData.caption && apiData.caption.text) {
      caption = apiData.caption.text;
      console.log('🔧 Caption extracted:', caption.substring(0, 50) + '...');
    } else if (apiData.caption) {
      caption = apiData.caption;
    }
    
    // Handle media URLs - check for carousel media first
    if (apiData.carousel_media && apiData.carousel_media.length > 0) {
      mediaType = 'CAROUSEL_ALBUM';
      imageUrl = apiData.carousel_media[0].image_versions2?.candidates?.[0]?.url || 
                 apiData.carousel_media[0].display_url ||
                 apiData.carousel_media[0].image_url;
      console.log('🔧 Carousel media found, first image URL:', imageUrl);
    } else if (apiData.image_versions2 && apiData.image_versions2.candidates) {
      imageUrl = apiData.image_versions2.candidates[0].url;
      console.log('🔧 Single image found:', imageUrl);
    } else if (apiData.display_url) {
      imageUrl = apiData.display_url;
      console.log('🔧 Display URL found:', imageUrl);
    } else if (apiData.image_url) {
      imageUrl = apiData.image_url;
      console.log('🔧 Image URL found:', imageUrl);
    } else {
      console.log('🔧 No image URL found in:', {
        hasCarousel: !!apiData.carousel_media,
        hasImageVersions: !!apiData.image_versions2,
        hasDisplayUrl: !!apiData.display_url,
        hasImageUrl: !!apiData.image_url
      });
    }
    
    // Extract engagement data - check multiple possible field names
    console.log('🔧 Checking for engagement data...');
    console.log('🔧 Available fields for likes:', {
      like_count: apiData.like_count,
      likes: apiData.likes,
      likeCount: apiData.likeCount,
      like_and_view_counts_disabled: apiData.like_and_view_counts_disabled
    });
    
    if (apiData.like_count !== undefined) {
      likes = apiData.like_count;
      console.log('🔧 Likes found in like_count:', likes);
    } else if (apiData.likes !== undefined) {
      likes = apiData.likes;
      console.log('🔧 Likes found in likes:', likes);
    } else if (apiData.likeCount !== undefined) {
      likes = apiData.likeCount;
      console.log('🔧 Likes found in likeCount:', likes);
    } else {
      console.log('🔧 No likes data found');
    }
    
    console.log('🔧 Available fields for comments:', {
      comment_count: apiData.comment_count,
      comments: apiData.comments,
      commentCount: apiData.commentCount
    });
    
    if (apiData.comment_count !== undefined) {
      comments = apiData.comment_count;
      console.log('🔧 Comments found in comment_count:', comments);
    } else if (apiData.comments !== undefined) {
      comments = apiData.comments;
      console.log('🔧 Comments found in comments:', comments);
    } else if (apiData.commentCount !== undefined) {
      comments = apiData.commentCount;
      console.log('🔧 Comments found in commentCount:', comments);
    } else {
      console.log('🔧 No comments data found');
    }
    
    // Extract timestamp
    if (apiData.taken_at) {
      timestamp = apiData.taken_at * 1000; // Convert to milliseconds
      console.log('🔧 Timestamp from taken_at:', apiData.taken_at, '->', timestamp);
    } else if (apiData.timestamp) {
      timestamp = apiData.timestamp;
      console.log('🔧 Timestamp from timestamp:', apiData.timestamp);
    } else {
      console.log('🔧 No timestamp found in API data');
      console.log('🔧 Available timestamp fields:', {
        taken_at: apiData.taken_at,
        timestamp: apiData.timestamp,
        created_at: apiData.created_at,
        date: apiData.date
      });
    }
    
    // Extract permalink
    if (apiData.code) {
      permalink = `https://www.instagram.com/p/${apiData.code}/`;
    } else if (apiData.permalink) {
      permalink = apiData.permalink;
    }
    
    // Handle carousel posts
    let images = [];
    if (apiData.carousel_media && apiData.carousel_media.length > 0) {
      // Carousel post
      console.log('🔧 Processing carousel with', apiData.carousel_media.length, 'items');
      images = apiData.carousel_media.map((media, index) => {
        const imageUrl = media.image_versions2?.candidates?.[0]?.url || 
                        media.display_url || 
                        media.image_url;
        console.log(`🔧 Carousel item ${index + 1} URL:`, imageUrl);
        
        // Use Instagram images only - no local fallback
        const corsProxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(imageUrl)}`;
        const altProxyUrl = `https://corsproxy.io/?${encodeURIComponent(imageUrl)}`;
        
        return {
          type: 'image',
          url: imageUrl, // Original Instagram URL
          corsProxyUrl: corsProxyUrl, // Primary CORS proxy
          altProxyUrl: altProxyUrl, // Alternative CORS proxy
          alt: this.extractTitle(caption) || `NewJeans Image ${index + 1}`
        };
      });
    } else if (imageUrl) {
      // Single image post
      console.log('🔧 Single image URL:', imageUrl);
      const corsProxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(imageUrl)}`;
      const altProxyUrl = `https://corsproxy.io/?${encodeURIComponent(imageUrl)}`;
      
      images = [{
        type: 'image',
        url: imageUrl, // Original Instagram URL
        corsProxyUrl: corsProxyUrl, // Primary CORS proxy
        altProxyUrl: altProxyUrl, // Alternative CORS proxy
        alt: this.extractTitle(caption) || 'NewJeans'
      }];
    }
    
    console.log('🔧 Final images array length:', images.length);

    console.log(`Formatted data from ${host}:`, {
      imageUrl,
      caption: caption.substring(0, 100) + '...',
      likes,
      comments,
      imagesCount: images.length
    });

    const formattedData = {
      emoji: this.getEmojiFromCaption(caption),
      title: this.extractTitle(caption),
      subtitle: this.extractSubtitle(caption),
      gradient: this.getGradientFromType('IMAGE'),
      likes: this.formatNumber(likes),
      caption: caption,
      comments: this.formatNumber(comments),
      timestamp: this.getRelativeTime(timestamp),
      mediaUrl: imageUrl,
      permalink: permalink,
      mediaType: 'IMAGE',
      images: images,
      carousel: {
        autoPlay: true,
        interval: 3000,
        showIndicators: images.length > 1,
        showArrows: images.length > 1
      }
    };

    console.log('✅ Successfully formatted Instagram post data:', {
      title: formattedData.title,
      likes: formattedData.likes,
      comments: formattedData.comments,
      timestamp: formattedData.timestamp,
      imagesCount: formattedData.images.length,
      hasCaption: !!formattedData.caption,
      hasPermalink: !!formattedData.permalink
    });

    return formattedData;
  }

  // Helper methods
  getEmojiFromCaption(caption) {
    const emojis = ['🎉', '✨', '💖', '🔥', '🎵', '📸', '🎤', '🎭', '🌟', '💫'];
    return emojis[Math.floor(Math.random() * emojis.length)];
  }

  extractTitle(caption) {
    // Extract first line or first few words as title
    const lines = caption.split('\n');
    return lines[0].substring(0, 20) + (lines[0].length > 20 ? '...' : '');
  }

  extractSubtitle(caption) {
    // Extract hashtags or second line as subtitle
    const hashtags = caption.match(/#\w+/g);
    return hashtags ? hashtags.slice(0, 3).join(' ') : 'NewJeans';
  }

  getGradientFromType(mediaType) {
    const gradients = {
      'IMAGE': 'from-purple-400 via-pink-400 to-orange-400',
      'VIDEO': 'from-blue-400 via-purple-400 to-pink-400',
      'CAROUSEL_ALBUM': 'from-pink-400 via-orange-400 to-yellow-400'
    };
    return gradients[mediaType] || gradients['IMAGE'];
  }

  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  getRelativeTime(timestamp) {
    const now = new Date();
    const postTime = new Date(timestamp);
    const diffMs = now - postTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return postTime.toLocaleDateString();
  }
}

// Alternative: Web scraping method (for development/testing)
// (Class InstagramScraper dihapus karena tidak digunakan)

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { InstagramAPI };
} 