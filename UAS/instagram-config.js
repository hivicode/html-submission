// Instagram Widget Configuration
const INSTAGRAM_CONFIG = {

  "currentPost": {
    "emoji": "🎉",
    "title": "NewJeans Day",
    "subtitle": "3rd Anniversary",
    "gradient": "from-purple-400 via-pink-400 to-orange-400",
    "likes": "352.8K",
    "comments": "2.6K",
    "timestamp": "7 hours ago",
    "postUrl": "https://www.instagram.com/p/C8XqQqQqQqQ/",
    "caption": "[NewJeans Day] NewJeans Debut 3rd Anniversary D-3 ✅ NewJeans Day On-Air #NewJeans #뉴진스 #NewJeansDay #NewJeans_3rd_Anniversary",
    "images": [
      {
        "type": "image",
        "url": "img/home/NJ_Supernatural_36.jpg",
        "alt": "NewJeans Supernatural"
      }
    ],
    "carousel": {
      "autoPlay": false,
      "interval": 3000,
      "showIndicators": true,
      "showArrows": false
    }
  },
  "account": {
    "username": "newjeans_official",
    "verified": true,
    "profilePicture": "img/profiles/newjeans.jpg"
  },
  "autoUpdate": {
    "enabled": true,
    "interval": 3600000,
    "maxPosts": 1,
    "cacheDuration": 3600000
  },
  "api": {
    "enabled": true,
    "type": "third_party",
    "username": "newjeans_official",
    "rapidApiKey": "8944d48147msh128e183e64d0a95p12d4b0jsn583834b569c0"
  }
};

// Export for use in other files
// (module.exports dihapus karena tidak digunakan di project ini)