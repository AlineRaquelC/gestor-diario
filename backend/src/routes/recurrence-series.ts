import { Router } from 'express';
import type { RecurrenceSeriesService } from '../services/recurrence-series.js';
import { createRecurrenceSchema, activateRecurrenceSchema, updateRecurrenceSchema, materializeSchema } from '../schemas/recurrence-series.js';

export function createRecurrenceSeriesRouter(service: RecurrenceSeriesService) {
  const router = Router();
  router.get('/', (_req, res) => {res.json(service.findAll());});
  router.post('/', (req, res) => {res.status(201).json(service.create(createRecurrenceSchema.parse(req.body)));});
  router.post('/materialize', (req, res) => {
    materializeSchema.parse(req.body ?? {});
    res.json(service.materializeAll());
  });
  router.post('/from-task/:taskId', (req, res) => {
    res.status(201).json(service.activate(req.params.taskId, activateRecurrenceSchema.parse(req.body)));
  });
  router.get('/:id', (req, res) => {res.json(service.findById(req.params.id));});
  router.patch('/:id', (req, res) => {res.json(service.update(req.params.id, updateRecurrenceSchema.parse(req.body)));});
  router.post('/:id/materialize', (req, res) => {
    materializeSchema.parse(req.body ?? {});
    res.json(service.materialize(req.params.id));
  });
  return router;
}
