export type PageType = 'CORE' | 'BLOG' | 'QA' | 'GLOSSARY' | 'CITY' | 'RESOURCES';
export type PageStatus = 'DRAFT' | 'PUBLISHED';

export interface PageMeta {
  metaTitle: string | null;
  metaDescription: string | null;
  keywords: string[];
  canonicalUrl: string | null;
  robots: string | null;
  noindex: boolean;
  nofollow: boolean;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  ogUrl: string | null;
  ogType: string | null;
  ogSiteName: string | null;
  ogLocale: string | null;
  twitterCard: string | null;
  twitterTitle: string | null;
  twitterDescription: string | null;
  twitterImage: string | null;
  twitterSite: string | null;
  twitterCreator: string | null;
  jsonldType: string | null;
  jsonldExtra: Record<string, unknown> | null;
  geoRegion: string | null;
  geoPlacename: string | null;
  geoPosition: string | null;
  icbm: string | null;
  hreflang: string[];
  alternateUrls: string[];
  authorName: string | null;
  publishedTime: string | null;
  modifiedTime: string | null;
  imageAlt: string | null;
}

export interface Page {
  id: string;
  type: PageType;
  slug: string;
  title: string;
  status: PageStatus;
  seeded: boolean;
  topic: string | null;
  category: string | null;
  date: string | null;
  author: string | null;
  readingTime: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  contentMd: string;
  url: string;
  meta: PageMeta | null;
}

export interface PageListResponse {
  total: number;
  page: number;
  pageSize: number;
  items: Page[];
}

export interface Admin {
  id: string;
  username: string;
  role: 'SUPER_ADMIN' | 'ADMIN';
  createdAt: string;
  lastLoginAt: string | null;
}

export interface PublicUserRow {
  id: string;
  username: string;
  displayName: string | null;
  pronouns: string | null;
  isBanned: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  counts: { questions: number; answers: number; comments: number };
}

export interface UserListResponse {
  total: number;
  page: number;
  pageSize: number;
  items: PublicUserRow[];
}

export interface StatsResponse {
  pages: {
    total: number;
    published: number;
    drafts: number;
    byType: { type: PageType; _count: number }[];
  };
  users: number;
  questions: number;
  answers: number;
  comments: number;
  reports: number;
  recentPages: Page[];
}

// ---------- Dynamic Q&A (public) ----------

export interface QuestionSummary {
  id: string;
  slug: string;
  title: string;
  bodyMd: string;
  topic: string | null;
  viewCount: number;
  status: string;
  answerCount: number;
  authorId: string | null;
  authorName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionListResponse {
  total: number;
  page: number;
  pageSize: number;
  items: QuestionSummary[];
}

export interface CommentNode {
  id: string;
  userId: string | null;
  authorName: string;
  bodyMd: string;
  createdAt: string;
  children: CommentNode[];
}

export interface AnswerDetail {
  id: string;
  questionId: string;
  bodyMd: string;
  votes: number;
  isBest: boolean;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  userVote: number | null;
  comments: CommentNode[];
}

export interface QuestionDetail {
  question: QuestionSummary;
  answers: AnswerDetail[];
  questionComments: CommentNode[];
  userVotes: Record<string, number>;
  me: { id: string; username: string } | null;
  related: QuestionSummary[];
}

export interface TopicsResponse {
  topics: { topic: string; count: number }[];
}

// ---------- Community forum (public) ----------

export interface ForumLastPost {
  topicId?: string;
  topicTitle?: string;
  authorName: string;
  createdAt: string;
}

export interface ForumBoard {
  id: string;
  category: string;
  name: string;
  slug: string;
  description: string;
  topicCount: number;
  postCount: number;
  lastPost: ForumLastPost | null;
}

export interface ForumCategory {
  name: string;
  boards: ForumBoard[];
}

export interface ForumIndexResponse {
  categories: ForumCategory[];
}

export interface ForumTopicSummary {
  id: string;
  boardId: string;
  boardSlug: string | null;
  boardName: string | null;
  title: string;
  status: string;
  pinned: boolean;
  locked: boolean;
  viewCount: number;
  replyCount: number;
  postCount: number;
  authorName: string | null;
  createdAt: string;
  updatedAt: string;
  lastPost: { authorName: string; createdAt: string } | null;
}

export interface ForumBoardResponse {
  board: ForumBoard;
  sort: string;
  total: number;
  page: number;
  pageSize: number;
  items: ForumTopicSummary[];
}

export interface ForumPostAuthor {
  id: string;
  username: string;
  displayName: string | null;
  createdAt: string;
  postCount: number;
}

export interface ForumPost {
  id: string;
  topicId: string;
  bodyMd: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  author: ForumPostAuthor | null;
}

export interface ForumTopicResponse {
  topic: ForumTopicSummary;
  total: number;
  page: number;
  pageSize: number;
  items: ForumPost[];
}
