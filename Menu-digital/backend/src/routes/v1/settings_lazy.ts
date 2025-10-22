import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { getCollection } from '../../lib/db';

const settings: FastifyPluginAsync = async (app): Promise<void> => {
  // Lazy DB access inside handlers to avoid plugin startup timeout when DB is down
  app.get('/v1/admin/settings', async (_req, reply) => {
    try {
      const settingsCol = await getCollection('settings');
      const doc = await settingsCol.findOne({ _id: 'global' });
      return reply.send(
        doc || {
          busyMode: false,
          delayMinutes: 0,
          appearance: {
            mode: 'light',
            primaryColor: '#F51414',
            secondaryColor: '#111111',
            fontFamily:
              "Poppins, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif",
            shapeRadius: 12,
          },
          branding: {
            displayName: 'Menu Digital',
            logoImageUrl: '',
            coverImageUrl: '',
            mobileCenterLogo: true,
          },
        }
      );
    } catch (err: any) {
      app.log.warn({ err }, 'Settings GET fallback without DB');
      // Fallback defaults when DB is unavailable
      return reply.send({
        busyMode: false,
        delayMinutes: 0,
        appearance: {
          mode: 'light',
          primaryColor: '#F51414',
          secondaryColor: '#111111',
          fontFamily:
            "Poppins, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif",
          shapeRadius: 12,
        },
        branding: {
          displayName: 'Menu Digital',
          logoImageUrl: '',
          coverImageUrl: '',
          mobileCenterLogo: true,
        },
      });
    }
  });

  app.patch('/v1/admin/settings', async (req, reply) => {
    const appearanceSchema = z
      .object({
        mode: z.enum(['light', 'dark']).optional(),
        primaryColor: z.string().optional(),
        secondaryColor: z.string().optional(),
        fontFamily: z.string().optional(),
        shapeRadius: z.number().int().min(0).optional(),
      })
      .strict();
    const brandingSchema = z
      .object({
        displayName: z.string().optional(),
        logoImageUrl: z.string().optional(),
        coverImageUrl: z.string().optional(),
        mobileCenterLogo: z.boolean().optional(),
      })
      .strict();
    const schema = z
      .object({
        busyMode: z.boolean().optional(),
        delayMinutes: z.number().int().min(0).optional(),
        appearance: appearanceSchema.optional(),
        branding: brandingSchema.optional(),
      })
      .strict();

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: 'Invalid input', details: parsed.error.flatten() });

    try {
      const settingsCol = await getCollection('settings');
      const update = { $set: parsed.data };
      await settingsCol.updateOne({ _id: 'global' }, update, { upsert: true });
      const updated = await settingsCol.findOne({ _id: 'global' });
      return reply.send(updated);
    } catch (err: any) {
      app.log.error({ err }, 'Settings PATCH failed due to DB');
      return reply.status(503).send({ error: 'Database unavailable' });
    }
  });

  // Public endpoint: expose appearance settings only to Menu app
  app.get('/v1/public/theme', async (_req, reply) => {
    try {
      const settingsCol = await getCollection('settings');
      const doc = await settingsCol.findOne({ _id: 'global' });
      const appearance = (doc as any)?.appearance;
      return reply.send(
        appearance || {
          mode: 'light',
          primaryColor: '#F51414',
          secondaryColor: '#111111',
          fontFamily:
            "Poppins, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif",
          shapeRadius: 12,
        }
      );
    } catch (err: any) {
      app.log.warn({ err }, 'Public theme GET fallback without DB');
      return reply.send({
        mode: 'light',
        primaryColor: '#F51414',
        secondaryColor: '#111111',
        fontFamily:
          "Poppins, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif",
        shapeRadius: 12,
      });
    }
  });

  // Public endpoint: expose branding settings to Menu app
  app.get('/v1/public/branding', async (_req, reply) => {
    try {
      const settingsCol = await getCollection('settings');
      const doc = await settingsCol.findOne({ _id: 'global' });
      const branding = (doc as any)?.branding;
      return reply.send(
        branding || {
          displayName: 'Menu Digital',
          logoImageUrl: '',
          coverImageUrl: '',
          mobileCenterLogo: true,
        }
      );
    } catch (err: any) {
      app.log.warn({ err }, 'Public branding GET fallback without DB');
      return reply.send({
        displayName: 'Menu Digital',
        logoImageUrl: '',
        coverImageUrl: '',
        mobileCenterLogo: true,
      });
    }
  });
};

export default settings;