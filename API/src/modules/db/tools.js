const express = require('express');
const { authMiddleware, requireCompanyScope } = require('../../auth/jwt');
const Tool = require('../../db/models/tool.model');

module.exports = function(){
  const r = express.Router();
  r.use(authMiddleware());
  r.use(requireCompanyScope());

  r.get('/tools', async (req, res) => {
    try {
      let { limit = 1000, page = 1, q } = req.query;
      limit = Math.max(1, Math.min(1000, Number(limit) || 1000));
      page = Math.max(1, Number(page) || 1);
      const query = {};
      if (q) query['name'] = { $regex: String(q), $options: 'i' };
      const list = await Tool.find(query).sort({ name: 1 }).skip((page-1)*limit).limit(limit).lean();
      try { console.info('[api/tools] served', { count: list.length, names: list.map(x=>x.name) }); } catch {}
      res.apiOk(list);
    } catch (e) {
      res.apiError(500, 'tools_list_failed', e.message || 'Failed to list tools');
    }
  });

  return r;
};
