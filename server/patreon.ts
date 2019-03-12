import express = require("express");
import * as _ from "lodash";
import request = require("request");

import * as DB from "./dbconnection";

type Req = Express.Request & express.Request;
type Res = Express.Response & express.Response;

const baseUrl = process.env.BASE_URL,
  patreonUrl = process.env.PATREON_URL;

interface Post {
  attributes: {
    title: string;
    content: string;
    url: string;
    created_at: string;
    was_posted_by_campaign_owner: boolean;
  };
  id: string;
  type: string;
}

export function configureLoginRedirect(app: express.Application) {
  const redirectPath = "/r/patreon";
  app.get(redirectPath, async (req: Req, res: Res) => {
    try {
      // const code = req.query.code;

      // const OAuthClient = patreon.oauth(patreonClientId, patreonClientSecret);

      // const tokens = await OAuthClient.getTokens(code, redirectUri);

      // const APIClient = patreon.patreon(tokens.access_token);
      // const { rawJson } = await APIClient(`/current_user`);
      await handleCurrentUser(req, res);
    } catch (e) {
      console.error("Patreon login flow failed: " + e);
      res.status(500).send(e);
    }
  });
}

async function handleCurrentUser(req: Req, res: Res) {
  const encounterId = req.query.state.replace(/['"]/g, "");

  const session = req.session;
  if (session === undefined) {
    throw "Session is undefined";
  }

  session.hasStorage = true;
  session.hasEpicInitiative = true;
  session.isLoggedIn = true;

  const user = await DB.upsertUser("dave", "", "", "epicinitiative");
  if (user === undefined) {
    throw "Failed to insert user into database";
  }
  session.userId = user._id;
  res.redirect(`/e/${encounterId}`);
}

export function configureLogout(app: express.Application) {
  const logoutPath = "/logout";
  app.get(logoutPath, (req: Req, res: Res) => {
    if (req.session == null) {
      throw "Session is not available";
    }

    req.session.destroy(err => {
      if (err) {
        console.error(err);
      }

      if (baseUrl == null) {
        throw "Base URL is not configured.";
      }

      return res.redirect(baseUrl);
    });
  });
}

function updateLatestPost(latestPost: { post: Post | null }) {
  if (patreonUrl == null) {
    throw "Patreon URL is not configured.";
  }

  return request.get(patreonUrl, (error, response, body) => {
    const json: { data: Post[] } = JSON.parse(body);
    if (json.data) {
      latestPost.post = json.data.filter(
        d => d.attributes.was_posted_by_campaign_owner
      )[0];
    }
  });
}

export function startNewsUpdates(app: express.Application) {
  const latest: { post: Post | null } = { post: null };
  if (!patreonUrl) {
    return;
  }

  updateLatestPost(latest);

  app.get("/updatenews/", (req: Req, res: Res) => {
    updateLatestPost(latest);
    res.sendStatus(200);
  });

  app.get("/whatsnew/", (req, res) => {
    res.json(latest.post);
  });
}
