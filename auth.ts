import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Nodemailer from "next-auth/providers/nodemailer";
import { prisma } from "@/lib/prisma";
import type { Provider } from "next-auth/providers";

const providers: Provider[] = [
  Google({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  }),
];

// Only add Nodemailer if EMAIL_SERVER is configured
if (process.env.EMAIL_SERVER) {
  providers.push(
    Nodemailer({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM ?? "Anna Cards <noreply@example.com>",
    })
  );
}

// Yandex OAuth
if (process.env.YANDEX_CLIENT_ID && process.env.YANDEX_CLIENT_SECRET) {
  providers.push({
    id: "yandex",
    name: "Yandex",
    type: "oauth",
    authorization: {
      url: "https://oauth.yandex.com/authorize",
      params: { response_type: "code", scope: "login:email login:info" },
    },
    token: "https://oauth.yandex.com/token",
    userinfo: "https://login.yandex.ru/info?format=json",
    clientId: process.env.YANDEX_CLIENT_ID,
    clientSecret: process.env.YANDEX_CLIENT_SECRET,
    profile(profile: {
      id: string;
      real_name?: string;
      display_name?: string;
      default_email?: string;
      default_avatar_id?: string;
    }) {
      return {
        id: profile.id,
        name: profile.real_name ?? profile.display_name ?? null,
        email: profile.default_email ?? null,
        image: profile.default_avatar_id
          ? `https://avatars.yandex.net/get-yapic/${profile.default_avatar_id}/islands-200`
          : null,
      };
    },
  } as Parameters<typeof providers.push>[0]);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers,
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    verifyRequest: "/auth/verify",
  },
});
