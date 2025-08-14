export class Tutorial {
  constructor(data) {
    this.id = data.id;
    this.title = data.title;
    this.description = data.description;
    this.category = data.category;
    this.difficulty = data.difficulty;
    this.estimated_time = data.estimated_time;
    this.order_index = data.order_index;
    this.is_required = data.is_required;
    this.prerequisites = data.prerequisites || [];
    this.content = data.content;
  }

  get formattedTime() {
    if (!this.estimated_time) return 'N/A';
    if (this.estimated_time < 60) {
      return `${this.estimated_time}m`;
    }
    const hours = Math.floor(this.estimated_time / 60);
    const minutes = this.estimated_time % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  get difficultyColor() {
    const colors = {
      beginner: 'bg-green-100 text-green-800 border-green-200',
      intermediate: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      advanced: 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[this.difficulty] || colors.beginner;
  }

  static async list(sortBy = 'order_index') {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Comprehensive social media marketing tutorials based on industry standards
    const mockTutorials = [
      {
        id: 1,
        title: "Social Media Strategy Fundamentals",
        description: "Master the core principles of social media marketing: audience identification, platform selection, content pillars, and brand voice development.",
        category: "strategy",
        difficulty: "beginner",
        estimated_time: 60,
        order_index: 1,
        is_required: true,
        prerequisites: [],
        content: {
          sections: [
            {
              title: "Understanding Your Audience",
              content: "Learn to create detailed buyer personas, analyze demographics, understand pain points, and map the customer journey. Use tools like Facebook Audience Insights, Google Analytics, and social listening platforms to gather data. Identify where your audience spends time online and what content they engage with most."
            },
            {
              title: "Platform Selection & Strategy",
              content: "Evaluate which platforms align with your business goals: Instagram for visual storytelling, LinkedIn for B2B networking, TikTok for trend-driven content, Twitter for real-time engagement, and Facebook for community building. Each platform requires a unique approach and content strategy."
            },
            {
              title: "Content Pillars & Brand Voice",
              content: "Develop 3-5 content pillars that align with your brand values and audience interests. Establish a consistent brand voice that reflects your company personality. Create style guides for tone, language, and visual elements to maintain consistency across all channels."
            },
            {
              title: "Goal Setting & KPIs",
              content: "Set SMART goals (Specific, Measurable, Achievable, Relevant, Time-bound) for your social media efforts. Define key performance indicators like engagement rate, reach, click-through rate, conversion rate, and return on ad spend. Track progress monthly and adjust strategies accordingly."
            }
          ]
        }
      },
      {
        id: 2,
        title: "Content Creation & Visual Design",
        description: "Learn professional content creation techniques including copywriting, graphic design principles, video production, and multi-format content development.",
        category: "content-creation",
        difficulty: "intermediate",
        estimated_time: 90,
        order_index: 2,
        is_required: true,
        prerequisites: [1],
        content: {
          sections: [
            {
              title: "Copywriting for Social Media",
              content: "Master the art of writing compelling social media copy. Learn hook writing techniques, storytelling principles, and platform-specific best practices. Understand character limits, hashtag strategy, and call-to-action optimization. Practice writing for different formats: posts, stories, ads, and captions."
            },
            {
              title: "Visual Design Principles",
              content: "Apply fundamental design principles: hierarchy, contrast, balance, and consistency. Learn color psychology and typography basics. Master aspect ratios for different platforms (1:1 for Instagram posts, 16:9 for YouTube, 9:16 for Stories). Use design tools like Canva, Figma, or Adobe Creative Suite."
            },
            {
              title: "Video Content Production",
              content: "Create engaging video content for platforms like TikTok, Instagram Reels, and YouTube Shorts. Learn basic video editing, storytelling through motion, and platform-specific video requirements. Understand optimal video lengths, thumbnail design, and caption optimization for video content."
            },
            {
              title: "Multi-Format Content Strategy",
              content: "Repurpose content across multiple formats and platforms. Learn to adapt one piece of content into posts, stories, videos, and carousels. Develop content calendars that maximize reach while maintaining quality. Use tools like Later, Buffer, or Hootsuite for content planning and scheduling."
            }
          ]
        }
      },
      {
        id: 3,
        title: "Platform-Specific Best Practices",
        description: "Master the unique features, algorithms, and best practices for each major social media platform to maximize engagement and reach.",
        category: "platforms",
        difficulty: "intermediate",
        estimated_time: 120,
        order_index: 3,
        is_required: true,
        prerequisites: [1, 2],
        content: {
          sections: [
            {
              title: "Instagram Mastery",
              content: "Optimize Instagram posts, stories, reels, and IGTV content. Understand the algorithm factors: engagement rate, recency, relationship, and frequency. Master hashtag strategy, location tagging, and user-generated content campaigns. Learn to use Instagram Shopping, Live features, and collaborative posts effectively."
            },
            {
              title: "LinkedIn B2B Strategy",
              content: "Develop professional content for LinkedIn including thought leadership posts, company updates, and industry insights. Understand LinkedIn's algorithm preferences for engagement and reach. Master networking strategies, content publishing times, and professional hashtag usage. Learn to leverage LinkedIn Groups and Sales Navigator."
            },
            {
              title: "TikTok & Short-Form Video",
              content: "Create viral-worthy content for TikTok, Instagram Reels, and YouTube Shorts. Understand trending sounds, challenges, and hashtag strategies. Learn video editing techniques, storytelling in 15-60 seconds, and community engagement tactics. Master the algorithm factors: watch time, shares, and engagement."
            },
            {
              title: "Twitter & Real-Time Engagement",
              content: "Navigate Twitter's fast-paced environment with real-time content, trending topics, and community engagement. Learn thread writing, quote tweets, and Twitter Spaces. Understand hashtag trends, optimal posting times, and crisis communication strategies. Master the art of concise, impactful messaging."
            }
          ]
        }
      },
      {
        id: 4,
        title: "Community Management & Engagement",
        description: "Build and nurture engaged communities through strategic engagement, moderation, user-generated content, and relationship building.",
        category: "community",
        difficulty: "intermediate",
        estimated_time: 75,
        order_index: 4,
        is_required: true,
        prerequisites: [1, 2],
        content: {
          sections: [
            {
              title: "Community Building Strategies",
              content: "Develop strategies to build authentic, engaged communities around your brand. Create community guidelines, foster meaningful conversations, and encourage user-generated content. Learn to identify and nurture brand advocates, handle negative feedback professionally, and create inclusive spaces for your audience."
            },
            {
              title: "Engagement & Response Management",
              content: "Master the art of community engagement through timely responses, personalized interactions, and proactive community management. Learn to handle comments, direct messages, and mentions across all platforms. Develop response templates for common questions and crisis situations. Use social listening tools to monitor brand mentions and sentiment."
            },
            {
              title: "User-Generated Content Campaigns",
              content: "Design and execute UGC campaigns that encourage community participation. Learn to create hashtag challenges, photo contests, and testimonial campaigns. Understand legal considerations, content rights, and compensation strategies. Develop systems for discovering, curating, and amplifying user-generated content."
            },
            {
              title: "Crisis Management & Moderation",
              content: "Handle social media crises professionally and efficiently. Develop crisis communication protocols, response templates, and escalation procedures. Learn content moderation best practices, community guidelines enforcement, and when to involve legal or PR teams. Practice transparency and authenticity in all communications."
            }
          ]
        }
      },
      {
        id: 5,
        title: "Paid Social Media Advertising",
        description: "Master social media advertising including campaign setup, audience targeting, ad creative optimization, and performance measurement.",
        category: "advertising",
        difficulty: "advanced",
        estimated_time: 90,
        order_index: 5,
        is_required: false,
        prerequisites: [1, 2, 3],
        content: {
          sections: [
            {
              title: "Campaign Strategy & Setup",
              content: "Develop comprehensive paid social media strategies aligned with business objectives. Learn campaign structure, budget allocation, and bidding strategies. Master platform-specific ad formats: Facebook/Instagram ads, LinkedIn sponsored content, Twitter promoted tweets, and TikTok ads. Understand campaign optimization and scaling strategies."
            },
            {
              title: "Audience Targeting & Segmentation",
              content: "Master advanced audience targeting techniques including custom audiences, lookalike audiences, and interest-based targeting. Learn demographic, behavioral, and psychographic segmentation strategies. Understand retargeting campaigns, cross-platform audience building, and audience research tools. Develop data-driven targeting strategies."
            },
            {
              title: "Ad Creative & Copy Optimization",
              content: "Create high-performing ad creative that drives conversions. Learn A/B testing methodologies, creative best practices, and platform-specific requirements. Master ad copywriting, visual design for ads, and call-to-action optimization. Understand creative fatigue and when to refresh ad creative."
            },
            {
              title: "Performance Measurement & Optimization",
              content: "Track and optimize campaign performance using platform analytics and third-party tools. Learn key metrics: CTR, CPC, CPM, conversion rate, and ROAS. Master campaign optimization techniques, budget management, and scaling strategies. Develop reporting frameworks and optimization workflows."
            }
          ]
        }
      },
      {
        id: 6,
        title: "Analytics & Performance Measurement",
        description: "Learn to measure, analyze, and optimize social media performance using data-driven insights and reporting frameworks.",
        category: "analytics",
        difficulty: "advanced",
        estimated_time: 75,
        order_index: 6,
        is_required: true,
        prerequisites: [1, 2, 3],
        content: {
          sections: [
            {
              title: "Social Media Analytics Fundamentals",
              content: "Understand key social media metrics and their business impact. Learn to track engagement rate, reach, impressions, clicks, and conversions. Master platform-specific analytics: Instagram Insights, Facebook Page Insights, LinkedIn Analytics, and Twitter Analytics. Develop custom reporting dashboards and KPI tracking systems."
            },
            {
              title: "Data Analysis & Insights",
              content: "Transform raw data into actionable insights for strategy optimization. Learn data visualization techniques, trend analysis, and competitive benchmarking. Master social listening tools for sentiment analysis and brand monitoring. Develop reporting frameworks that communicate value to stakeholders and drive strategic decisions."
            },
            {
              title: "ROI Measurement & Attribution",
              content: "Measure the return on investment for social media activities. Learn attribution modeling, conversion tracking, and revenue attribution. Master tools like Google Analytics, Facebook Pixel, and platform conversion tracking. Develop frameworks for calculating social media ROI and communicating value to business stakeholders."
            },
            {
              title: "Performance Optimization",
              content: "Use data insights to continuously optimize social media performance. Learn A/B testing methodologies, content optimization strategies, and audience refinement techniques. Master performance benchmarking, competitive analysis, and industry best practices. Develop optimization workflows and continuous improvement processes."
            }
          ]
        }
      },
      {
        id: 7,
        title: "Influencer Marketing & Partnerships",
        description: "Develop strategic influencer partnerships, manage campaigns, and measure the impact of influencer collaborations on brand awareness and conversions.",
        category: "influencer-marketing",
        difficulty: "advanced",
        estimated_time: 60,
        order_index: 7,
        is_required: false,
        prerequisites: [1, 2, 4],
        content: {
          sections: [
            {
              title: "Influencer Strategy & Selection",
              content: "Develop comprehensive influencer marketing strategies aligned with brand objectives. Learn to identify relevant influencers using tools like BuzzSumo, Upfluence, and platform analytics. Master influencer vetting processes, authenticity verification, and audience quality assessment. Understand different influencer tiers and partnership models."
            },
            {
              title: "Campaign Management & Execution",
              content: "Manage end-to-end influencer campaigns from brief development to performance measurement. Learn to create compelling briefs, negotiate partnerships, and manage campaign timelines. Master content approval processes, brand safety measures, and legal compliance requirements. Develop systems for campaign tracking and performance monitoring."
            },
            {
              title: "Partnership Development & Relationship Building",
              content: "Build long-term relationships with influencers and content creators. Learn partnership negotiation, contract development, and relationship management strategies. Master influencer activation programs, ambassador programs, and ongoing collaboration frameworks. Understand compensation models and value exchange strategies."
            },
            {
              title: "Performance Measurement & Optimization",
              content: "Measure the impact of influencer campaigns on brand awareness, engagement, and conversions. Learn to track influencer-specific metrics, attribution modeling, and ROI calculation. Master campaign optimization techniques, influencer performance analysis, and partnership scaling strategies. Develop reporting frameworks for influencer marketing success."
            }
          ]
        }
      },
      {
        id: 8,
        title: "Social Media Crisis Management",
        description: "Handle social media crises professionally, develop crisis communication protocols, and protect brand reputation during challenging situations.",
        category: "crisis-management",
        difficulty: "advanced",
        estimated_time: 45,
        order_index: 8,
        is_required: false,
        prerequisites: [1, 4, 6],
        content: {
          sections: [
            {
              title: "Crisis Prevention & Preparedness",
              content: "Develop proactive crisis prevention strategies and preparedness protocols. Learn risk assessment, monitoring systems, and early warning indicators. Master crisis communication planning, spokesperson training, and escalation procedures. Create crisis response playbooks and communication templates for various scenarios."
            },
            {
              title: "Crisis Response & Communication",
              content: "Execute crisis response strategies with speed, transparency, and authenticity. Learn crisis communication principles, response timing, and messaging strategies. Master stakeholder communication, media relations, and community management during crises. Develop systems for coordinated response across all channels and stakeholders."
            },
            {
              title: "Reputation Management & Recovery",
              content: "Manage brand reputation during and after crisis situations. Learn reputation monitoring, sentiment analysis, and recovery strategies. Master post-crisis communication, stakeholder rebuilding, and long-term reputation management. Develop frameworks for learning from crises and improving future response capabilities."
            },
            {
              title: "Legal & Compliance Considerations",
              content: "Navigate legal and compliance requirements during social media crises. Learn defamation laws, privacy regulations, and platform terms of service. Master legal consultation processes, documentation requirements, and regulatory compliance. Understand when to involve legal counsel and how to protect the organization legally."
            }
          ]
        }
      },
      {
        id: 9,
        title: "Social Media Tools & Technology",
        description: "Master essential social media tools for content creation, scheduling, analytics, and team collaboration to streamline workflows and improve efficiency.",
        category: "tools",
        difficulty: "intermediate",
        estimated_time: 60,
        order_index: 9,
        is_required: false,
        prerequisites: [1, 2],
        content: {
          sections: [
            {
              title: "Content Creation & Design Tools",
              content: "Master essential tools for social media content creation. Learn Canva for graphic design, CapCut for video editing, and Adobe Creative Suite for professional design work. Understand tool integrations, workflow optimization, and team collaboration features. Develop efficient content creation processes and asset management systems."
            },
            {
              title: "Scheduling & Publishing Platforms",
              content: "Optimize content scheduling and publishing workflows using tools like Later, Buffer, Hootsuite, and Sprout Social. Learn content calendar management, cross-platform publishing, and automation strategies. Master scheduling algorithms, optimal posting times, and platform-specific publishing features. Develop content approval workflows and team collaboration processes."
            },
            {
              title: "Analytics & Monitoring Tools",
              content: "Leverage advanced analytics and monitoring tools for comprehensive social media insights. Learn Google Analytics, Facebook Business Suite, and third-party analytics platforms. Master social listening tools, sentiment analysis, and competitive monitoring. Develop custom reporting dashboards and automated monitoring systems."
            },
            {
              title: "Team Collaboration & Workflow Management",
              content: "Streamline team collaboration and workflow management using project management tools. Learn ClickUp, Asana, or Monday.com for task management and team coordination. Master approval workflows, content calendars, and team communication systems. Develop efficient processes for content creation, review, and publishing."
            }
          ]
        }
      },
      {
        id: 10,
        title: "Emerging Trends & Future of Social Media",
        description: "Stay ahead of the curve by understanding emerging social media trends, new platforms, and future developments in digital marketing.",
        category: "trends",
        difficulty: "advanced",
        estimated_time: 45,
        order_index: 10,
        is_required: false,
        prerequisites: [1, 2, 3],
        content: {
          sections: [
            {
              title: "Emerging Platforms & Features",
              content: "Stay current with new social media platforms and emerging features. Learn about emerging platforms like BeReal, Lemon8, and new features on existing platforms. Understand platform adoption strategies, early adopter advantages, and risk assessment for new platforms. Develop frameworks for evaluating and testing new social media opportunities."
            },
            {
              title: "Technology Trends & Innovations",
              content: "Understand emerging technologies shaping social media marketing. Learn about AI-powered content creation, augmented reality, virtual reality, and blockchain applications. Master automation tools, chatbots, and AI-driven optimization strategies. Stay informed about privacy changes, algorithm updates, and platform policy developments."
            },
            {
              title: "Content Format Evolution",
              content: "Adapt to evolving content formats and consumption patterns. Learn about short-form video trends, interactive content, and immersive experiences. Understand content personalization, dynamic content, and adaptive storytelling techniques. Master emerging content formats and platform-specific content innovations."
            },
            {
              title: "Future Strategy Development",
              content: "Develop forward-thinking social media strategies that anticipate future trends. Learn scenario planning, trend forecasting, and adaptive strategy development. Master innovation frameworks, experimentation methodologies, and continuous learning approaches. Develop systems for staying current with industry developments and adapting strategies accordingly."
            }
          ]
        }
      }
    ];

    // Apply sorting
    let sortedTutorials = [...mockTutorials];
    
    if (sortBy === 'order_index') {
      sortedTutorials.sort((a, b) => a.order_index - b.order_index);
    } else if (sortBy === 'difficulty') {
      const difficultyOrder = { beginner: 1, intermediate: 2, advanced: 3 };
      sortedTutorials.sort((a, b) => difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]);
    }

    return sortedTutorials.map(tutorial => new Tutorial(tutorial));
  }

  static async findById(id) {
    const tutorials = await this.list();
    return tutorials.find(t => t.id === id);
  }
}
