import type { PlatformType } from "./types";

export interface PlatformCapabilities {
  // Content types
  poll: boolean;
  thread: boolean;
  video: boolean;
  gif: boolean;
  images: boolean;

  // Features
  altText: boolean;
  replySettings: boolean;
  quoteTweet: boolean;
  repost: boolean;
  geo: boolean;
  community: boolean;
  editPost: boolean;

  // Media limits
  maxImages: number;
  maxVideos: number;
  maxGifs: number;

  // Poll limits (only relevant when poll === true)
  maxPollOptions: number;
  minPollOptions: number;
  maxPollOptionLength: number;
  minPollDurationMinutes: number;
  maxPollDurationMinutes: number;
}

export const PLATFORM_CAPABILITIES: Record<PlatformType, PlatformCapabilities> =
  {
    twitter: {
      poll: true,
      thread: true,
      video: true,
      gif: true,
      images: true,
      altText: true,
      replySettings: true,
      quoteTweet: true,
      repost: true,
      geo: true,
      community: true,
      editPost: true,
      maxImages: 4,
      maxVideos: 1,
      maxGifs: 1,
      maxPollOptions: 4,
      minPollOptions: 2,
      maxPollOptionLength: 25,
      minPollDurationMinutes: 5,
      maxPollDurationMinutes: 10080, // 7 days
    },
    linkedin: {
      poll: false,
      thread: false,
      video: true,
      gif: true,
      images: true,
      altText: true,
      replySettings: false,
      quoteTweet: false,
      repost: false,
      geo: false,
      community: false,
      editPost: false,
      maxImages: 9,
      maxVideos: 1,
      maxGifs: 1,
      maxPollOptions: 0,
      minPollOptions: 0,
      maxPollOptionLength: 0,
      minPollDurationMinutes: 0,
      maxPollDurationMinutes: 0,
    },
    threads: {
      poll: false,
      thread: true,
      video: true,
      gif: true,
      images: true,
      altText: true,
      replySettings: false,
      quoteTweet: false,
      repost: false,
      geo: false,
      community: false,
      editPost: false,
      maxImages: 10,
      maxVideos: 1,
      maxGifs: 1,
      maxPollOptions: 0,
      minPollOptions: 0,
      maxPollOptionLength: 0,
      minPollDurationMinutes: 0,
      maxPollDurationMinutes: 0,
    },
  };
