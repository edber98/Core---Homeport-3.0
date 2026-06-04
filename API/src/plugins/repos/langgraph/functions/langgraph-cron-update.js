const { utils } = require('./utils');

module.exports = {
  async langgraph_cron_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const d = inputs || {};
    let reqPath = "/crons/{cron_id}";
    const cron_id = String(d.cron_id || '').trim();
    if (!cron_id) return { ok: false, error: 'cron_id requis.' };
    reqPath = reqPath.replace('{cron_id}', encodeURIComponent(cron_id));

    const query = {};

    const headers = {};

    const body = {};
    if (d.revision_source !== undefined && d.revision_source !== null && d.revision_source !== '') {
      body["revision_source"] = d.revision_source;
    }
    if (d.source_config !== undefined && d.source_config !== null && d.source_config !== '') {
      body["source_config"] = d.source_config;
    }
    if (d.source_config_integration_id !== undefined && d.source_config_integration_id !== null && d.source_config_integration_id !== '') {
      if (!body["source_config"] || typeof body["source_config"] !== 'object' || Array.isArray(body["source_config"])) body["source_config"] = {};
      body["source_config"]["integration_id"] = d.source_config_integration_id;
    }
    if (d.source_config_repo_url !== undefined && d.source_config_repo_url !== null && d.source_config_repo_url !== '') {
      if (!body["source_config"] || typeof body["source_config"] !== 'object' || Array.isArray(body["source_config"])) body["source_config"] = {};
      body["source_config"]["repo_url"] = d.source_config_repo_url;
    }
    if (d.source_config_deployment_type !== undefined && d.source_config_deployment_type !== null && d.source_config_deployment_type !== '') {
      if (!body["source_config"] || typeof body["source_config"] !== 'object' || Array.isArray(body["source_config"])) body["source_config"] = {};
      body["source_config"]["deployment_type"] = d.source_config_deployment_type;
    }
    if (d.source_config_build_on_push !== undefined && d.source_config_build_on_push !== null && d.source_config_build_on_push !== '') {
      if (!body["source_config"] || typeof body["source_config"] !== 'object' || Array.isArray(body["source_config"])) body["source_config"] = {};
      body["source_config"]["build_on_push"] = d.source_config_build_on_push;
    }
    if (d.source_config_custom_url !== undefined && d.source_config_custom_url !== null && d.source_config_custom_url !== '') {
      if (!body["source_config"] || typeof body["source_config"] !== 'object' || Array.isArray(body["source_config"])) body["source_config"] = {};
      body["source_config"]["custom_url"] = d.source_config_custom_url;
    }
    if (d.source_config_resource_spec !== undefined && d.source_config_resource_spec !== null && d.source_config_resource_spec !== '') {
      if (!body["source_config"] || typeof body["source_config"] !== 'object' || Array.isArray(body["source_config"])) body["source_config"] = {};
      body["source_config"]["resource_spec"] = d.source_config_resource_spec;
    }
    if (d.source_config_resource_spec_min_scale !== undefined && d.source_config_resource_spec_min_scale !== null && d.source_config_resource_spec_min_scale !== '') {
      if (!body["source_config"] || typeof body["source_config"] !== 'object' || Array.isArray(body["source_config"])) body["source_config"] = {};
      if (!body["source_config"]["resource_spec"] || typeof body["source_config"]["resource_spec"] !== 'object' || Array.isArray(body["source_config"]["resource_spec"])) body["source_config"]["resource_spec"] = {};
      body["source_config"]["resource_spec"]["min_scale"] = d.source_config_resource_spec_min_scale;
    }
    if (d.source_config_resource_spec_max_scale !== undefined && d.source_config_resource_spec_max_scale !== null && d.source_config_resource_spec_max_scale !== '') {
      if (!body["source_config"] || typeof body["source_config"] !== 'object' || Array.isArray(body["source_config"])) body["source_config"] = {};
      if (!body["source_config"]["resource_spec"] || typeof body["source_config"]["resource_spec"] !== 'object' || Array.isArray(body["source_config"]["resource_spec"])) body["source_config"]["resource_spec"] = {};
      body["source_config"]["resource_spec"]["max_scale"] = d.source_config_resource_spec_max_scale;
    }
    if (d.source_config_resource_spec_cpu !== undefined && d.source_config_resource_spec_cpu !== null && d.source_config_resource_spec_cpu !== '') {
      if (!body["source_config"] || typeof body["source_config"] !== 'object' || Array.isArray(body["source_config"])) body["source_config"] = {};
      if (!body["source_config"]["resource_spec"] || typeof body["source_config"]["resource_spec"] !== 'object' || Array.isArray(body["source_config"]["resource_spec"])) body["source_config"]["resource_spec"] = {};
      body["source_config"]["resource_spec"]["cpu"] = d.source_config_resource_spec_cpu;
    }
    if (d.source_config_resource_spec_cpu_limit !== undefined && d.source_config_resource_spec_cpu_limit !== null && d.source_config_resource_spec_cpu_limit !== '') {
      if (!body["source_config"] || typeof body["source_config"] !== 'object' || Array.isArray(body["source_config"])) body["source_config"] = {};
      if (!body["source_config"]["resource_spec"] || typeof body["source_config"]["resource_spec"] !== 'object' || Array.isArray(body["source_config"]["resource_spec"])) body["source_config"]["resource_spec"] = {};
      body["source_config"]["resource_spec"]["cpu_limit"] = d.source_config_resource_spec_cpu_limit;
    }
    if (d.source_config_resource_spec_memory_mb !== undefined && d.source_config_resource_spec_memory_mb !== null && d.source_config_resource_spec_memory_mb !== '') {
      if (!body["source_config"] || typeof body["source_config"] !== 'object' || Array.isArray(body["source_config"])) body["source_config"] = {};
      if (!body["source_config"]["resource_spec"] || typeof body["source_config"]["resource_spec"] !== 'object' || Array.isArray(body["source_config"]["resource_spec"])) body["source_config"]["resource_spec"] = {};
      body["source_config"]["resource_spec"]["memory_mb"] = d.source_config_resource_spec_memory_mb;
    }
    if (d.source_config_resource_spec_memory_limit_mb !== undefined && d.source_config_resource_spec_memory_limit_mb !== null && d.source_config_resource_spec_memory_limit_mb !== '') {
      if (!body["source_config"] || typeof body["source_config"] !== 'object' || Array.isArray(body["source_config"])) body["source_config"] = {};
      if (!body["source_config"]["resource_spec"] || typeof body["source_config"]["resource_spec"] !== 'object' || Array.isArray(body["source_config"]["resource_spec"])) body["source_config"]["resource_spec"] = {};
      body["source_config"]["resource_spec"]["memory_limit_mb"] = d.source_config_resource_spec_memory_limit_mb;
    }
    if (d.source_config_resource_spec_queue_min_scale !== undefined && d.source_config_resource_spec_queue_min_scale !== null && d.source_config_resource_spec_queue_min_scale !== '') {
      if (!body["source_config"] || typeof body["source_config"] !== 'object' || Array.isArray(body["source_config"])) body["source_config"] = {};
      if (!body["source_config"]["resource_spec"] || typeof body["source_config"]["resource_spec"] !== 'object' || Array.isArray(body["source_config"]["resource_spec"])) body["source_config"]["resource_spec"] = {};
      body["source_config"]["resource_spec"]["queue_min_scale"] = d.source_config_resource_spec_queue_min_scale;
    }
    if (d.source_config_resource_spec_queue_max_scale !== undefined && d.source_config_resource_spec_queue_max_scale !== null && d.source_config_resource_spec_queue_max_scale !== '') {
      if (!body["source_config"] || typeof body["source_config"] !== 'object' || Array.isArray(body["source_config"])) body["source_config"] = {};
      if (!body["source_config"]["resource_spec"] || typeof body["source_config"]["resource_spec"] !== 'object' || Array.isArray(body["source_config"]["resource_spec"])) body["source_config"]["resource_spec"] = {};
      body["source_config"]["resource_spec"]["queue_max_scale"] = d.source_config_resource_spec_queue_max_scale;
    }
    if (d.source_config_resource_spec_queue_cpu !== undefined && d.source_config_resource_spec_queue_cpu !== null && d.source_config_resource_spec_queue_cpu !== '') {
      if (!body["source_config"] || typeof body["source_config"] !== 'object' || Array.isArray(body["source_config"])) body["source_config"] = {};
      if (!body["source_config"]["resource_spec"] || typeof body["source_config"]["resource_spec"] !== 'object' || Array.isArray(body["source_config"]["resource_spec"])) body["source_config"]["resource_spec"] = {};
      body["source_config"]["resource_spec"]["queue_cpu"] = d.source_config_resource_spec_queue_cpu;
    }
    if (d.source_config_resource_spec_queue_cpu_limit !== undefined && d.source_config_resource_spec_queue_cpu_limit !== null && d.source_config_resource_spec_queue_cpu_limit !== '') {
      if (!body["source_config"] || typeof body["source_config"] !== 'object' || Array.isArray(body["source_config"])) body["source_config"] = {};
      if (!body["source_config"]["resource_spec"] || typeof body["source_config"]["resource_spec"] !== 'object' || Array.isArray(body["source_config"]["resource_spec"])) body["source_config"]["resource_spec"] = {};
      body["source_config"]["resource_spec"]["queue_cpu_limit"] = d.source_config_resource_spec_queue_cpu_limit;
    }
    if (d.source_config_resource_spec_queue_memory_mb !== undefined && d.source_config_resource_spec_queue_memory_mb !== null && d.source_config_resource_spec_queue_memory_mb !== '') {
      if (!body["source_config"] || typeof body["source_config"] !== 'object' || Array.isArray(body["source_config"])) body["source_config"] = {};
      if (!body["source_config"]["resource_spec"] || typeof body["source_config"]["resource_spec"] !== 'object' || Array.isArray(body["source_config"]["resource_spec"])) body["source_config"]["resource_spec"] = {};
      body["source_config"]["resource_spec"]["queue_memory_mb"] = d.source_config_resource_spec_queue_memory_mb;
    }
    if (d.source_config_resource_spec_queue_memory_limit_mb !== undefined && d.source_config_resource_spec_queue_memory_limit_mb !== null && d.source_config_resource_spec_queue_memory_limit_mb !== '') {
      if (!body["source_config"] || typeof body["source_config"] !== 'object' || Array.isArray(body["source_config"])) body["source_config"] = {};
      if (!body["source_config"]["resource_spec"] || typeof body["source_config"]["resource_spec"] !== 'object' || Array.isArray(body["source_config"]["resource_spec"])) body["source_config"]["resource_spec"] = {};
      body["source_config"]["resource_spec"]["queue_memory_limit_mb"] = d.source_config_resource_spec_queue_memory_limit_mb;
    }
    if (d.source_config_resource_spec_orchestrator_cpu !== undefined && d.source_config_resource_spec_orchestrator_cpu !== null && d.source_config_resource_spec_orchestrator_cpu !== '') {
      if (!body["source_config"] || typeof body["source_config"] !== 'object' || Array.isArray(body["source_config"])) body["source_config"] = {};
      if (!body["source_config"]["resource_spec"] || typeof body["source_config"]["resource_spec"] !== 'object' || Array.isArray(body["source_config"]["resource_spec"])) body["source_config"]["resource_spec"] = {};
      body["source_config"]["resource_spec"]["orchestrator_cpu"] = d.source_config_resource_spec_orchestrator_cpu;
    }
    if (d.source_config_resource_spec_orchestrator_cpu_limit !== undefined && d.source_config_resource_spec_orchestrator_cpu_limit !== null && d.source_config_resource_spec_orchestrator_cpu_limit !== '') {
      if (!body["source_config"] || typeof body["source_config"] !== 'object' || Array.isArray(body["source_config"])) body["source_config"] = {};
      if (!body["source_config"]["resource_spec"] || typeof body["source_config"]["resource_spec"] !== 'object' || Array.isArray(body["source_config"]["resource_spec"])) body["source_config"]["resource_spec"] = {};
      body["source_config"]["resource_spec"]["orchestrator_cpu_limit"] = d.source_config_resource_spec_orchestrator_cpu_limit;
    }
    if (d.source_config_resource_spec_orchestrator_memory_mb !== undefined && d.source_config_resource_spec_orchestrator_memory_mb !== null && d.source_config_resource_spec_orchestrator_memory_mb !== '') {
      if (!body["source_config"] || typeof body["source_config"] !== 'object' || Array.isArray(body["source_config"])) body["source_config"] = {};
      if (!body["source_config"]["resource_spec"] || typeof body["source_config"]["resource_spec"] !== 'object' || Array.isArray(body["source_config"]["resource_spec"])) body["source_config"]["resource_spec"] = {};
      body["source_config"]["resource_spec"]["orchestrator_memory_mb"] = d.source_config_resource_spec_orchestrator_memory_mb;
    }
    if (d.source_config_resource_spec_orchestrator_memory_limit_mb !== undefined && d.source_config_resource_spec_orchestrator_memory_limit_mb !== null && d.source_config_resource_spec_orchestrator_memory_limit_mb !== '') {
      if (!body["source_config"] || typeof body["source_config"] !== 'object' || Array.isArray(body["source_config"])) body["source_config"] = {};
      if (!body["source_config"]["resource_spec"] || typeof body["source_config"]["resource_spec"] !== 'object' || Array.isArray(body["source_config"]["resource_spec"])) body["source_config"]["resource_spec"] = {};
      body["source_config"]["resource_spec"]["orchestrator_memory_limit_mb"] = d.source_config_resource_spec_orchestrator_memory_limit_mb;
    }
    if (d.source_config_resource_spec_orchestrator_min_scale !== undefined && d.source_config_resource_spec_orchestrator_min_scale !== null && d.source_config_resource_spec_orchestrator_min_scale !== '') {
      if (!body["source_config"] || typeof body["source_config"] !== 'object' || Array.isArray(body["source_config"])) body["source_config"] = {};
      if (!body["source_config"]["resource_spec"] || typeof body["source_config"]["resource_spec"] !== 'object' || Array.isArray(body["source_config"]["resource_spec"])) body["source_config"]["resource_spec"] = {};
      body["source_config"]["resource_spec"]["orchestrator_min_scale"] = d.source_config_resource_spec_orchestrator_min_scale;
    }
    if (d.source_config_resource_spec_orchestrator_max_scale !== undefined && d.source_config_resource_spec_orchestrator_max_scale !== null && d.source_config_resource_spec_orchestrator_max_scale !== '') {
      if (!body["source_config"] || typeof body["source_config"] !== 'object' || Array.isArray(body["source_config"])) body["source_config"] = {};
      if (!body["source_config"]["resource_spec"] || typeof body["source_config"]["resource_spec"] !== 'object' || Array.isArray(body["source_config"]["resource_spec"])) body["source_config"]["resource_spec"] = {};
      body["source_config"]["resource_spec"]["orchestrator_max_scale"] = d.source_config_resource_spec_orchestrator_max_scale;
    }
    if (d.source_config_resource_spec_executor_cpu !== undefined && d.source_config_resource_spec_executor_cpu !== null && d.source_config_resource_spec_executor_cpu !== '') {
      if (!body["source_config"] || typeof body["source_config"] !== 'object' || Array.isArray(body["source_config"])) body["source_config"] = {};
      if (!body["source_config"]["resource_spec"] || typeof body["source_config"]["resource_spec"] !== 'object' || Array.isArray(body["source_config"]["resource_spec"])) body["source_config"]["resource_spec"] = {};
      body["source_config"]["resource_spec"]["executor_cpu"] = d.source_config_resource_spec_executor_cpu;
    }
    if (d.source_config_resource_spec_executor_cpu_limit !== undefined && d.source_config_resource_spec_executor_cpu_limit !== null && d.source_config_resource_spec_executor_cpu_limit !== '') {
      if (!body["source_config"] || typeof body["source_config"] !== 'object' || Array.isArray(body["source_config"])) body["source_config"] = {};
      if (!body["source_config"]["resource_spec"] || typeof body["source_config"]["resource_spec"] !== 'object' || Array.isArray(body["source_config"]["resource_spec"])) body["source_config"]["resource_spec"] = {};
      body["source_config"]["resource_spec"]["executor_cpu_limit"] = d.source_config_resource_spec_executor_cpu_limit;
    }
    if (d.source_config_resource_spec_executor_memory_mb !== undefined && d.source_config_resource_spec_executor_memory_mb !== null && d.source_config_resource_spec_executor_memory_mb !== '') {
      if (!body["source_config"] || typeof body["source_config"] !== 'object' || Array.isArray(body["source_config"])) body["source_config"] = {};
      if (!body["source_config"]["resource_spec"] || typeof body["source_config"]["resource_spec"] !== 'object' || Array.isArray(body["source_config"]["resource_spec"])) body["source_config"]["resource_spec"] = {};
      body["source_config"]["resource_spec"]["executor_memory_mb"] = d.source_config_resource_spec_executor_memory_mb;
    }
    if (d.source_config_resource_spec_executor_memory_limit_mb !== undefined && d.source_config_resource_spec_executor_memory_limit_mb !== null && d.source_config_resource_spec_executor_memory_limit_mb !== '') {
      if (!body["source_config"] || typeof body["source_config"] !== 'object' || Array.isArray(body["source_config"])) body["source_config"] = {};
      if (!body["source_config"]["resource_spec"] || typeof body["source_config"]["resource_spec"] !== 'object' || Array.isArray(body["source_config"]["resource_spec"])) body["source_config"]["resource_spec"] = {};
      body["source_config"]["resource_spec"]["executor_memory_limit_mb"] = d.source_config_resource_spec_executor_memory_limit_mb;
    }
    if (d.source_config_resource_spec_redis_cpu !== undefined && d.source_config_resource_spec_redis_cpu !== null && d.source_config_resource_spec_redis_cpu !== '') {
      if (!body["source_config"] || typeof body["source_config"] !== 'object' || Array.isArray(body["source_config"])) body["source_config"] = {};
      if (!body["source_config"]["resource_spec"] || typeof body["source_config"]["resource_spec"] !== 'object' || Array.isArray(body["source_config"]["resource_spec"])) body["source_config"]["resource_spec"] = {};
      body["source_config"]["resource_spec"]["redis_cpu"] = d.source_config_resource_spec_redis_cpu;
    }
    if (d.source_config_resource_spec_redis_cpu_limit !== undefined && d.source_config_resource_spec_redis_cpu_limit !== null && d.source_config_resource_spec_redis_cpu_limit !== '') {
      if (!body["source_config"] || typeof body["source_config"] !== 'object' || Array.isArray(body["source_config"])) body["source_config"] = {};
      if (!body["source_config"]["resource_spec"] || typeof body["source_config"]["resource_spec"] !== 'object' || Array.isArray(body["source_config"]["resource_spec"])) body["source_config"]["resource_spec"] = {};
      body["source_config"]["resource_spec"]["redis_cpu_limit"] = d.source_config_resource_spec_redis_cpu_limit;
    }
    if (d.source_config_resource_spec_redis_memory_mb !== undefined && d.source_config_resource_spec_redis_memory_mb !== null && d.source_config_resource_spec_redis_memory_mb !== '') {
      if (!body["source_config"] || typeof body["source_config"] !== 'object' || Array.isArray(body["source_config"])) body["source_config"] = {};
      if (!body["source_config"]["resource_spec"] || typeof body["source_config"]["resource_spec"] !== 'object' || Array.isArray(body["source_config"]["resource_spec"])) body["source_config"]["resource_spec"] = {};
      body["source_config"]["resource_spec"]["redis_memory_mb"] = d.source_config_resource_spec_redis_memory_mb;
    }
    if (d.source_config_resource_spec_redis_memory_limit_mb !== undefined && d.source_config_resource_spec_redis_memory_limit_mb !== null && d.source_config_resource_spec_redis_memory_limit_mb !== '') {
      if (!body["source_config"] || typeof body["source_config"] !== 'object' || Array.isArray(body["source_config"])) body["source_config"] = {};
      if (!body["source_config"]["resource_spec"] || typeof body["source_config"]["resource_spec"] !== 'object' || Array.isArray(body["source_config"]["resource_spec"])) body["source_config"]["resource_spec"] = {};
      body["source_config"]["resource_spec"]["redis_memory_limit_mb"] = d.source_config_resource_spec_redis_memory_limit_mb;
    }
    if (d.source_config_resource_spec_labels !== undefined && d.source_config_resource_spec_labels !== null && d.source_config_resource_spec_labels !== '') {
      if (!body["source_config"] || typeof body["source_config"] !== 'object' || Array.isArray(body["source_config"])) body["source_config"] = {};
      if (!body["source_config"]["resource_spec"] || typeof body["source_config"]["resource_spec"] !== 'object' || Array.isArray(body["source_config"]["resource_spec"])) body["source_config"]["resource_spec"] = {};
      body["source_config"]["resource_spec"]["labels"] = d.source_config_resource_spec_labels;
    }
    if (d.source_config_resource_spec_annotations !== undefined && d.source_config_resource_spec_annotations !== null && d.source_config_resource_spec_annotations !== '') {
      if (!body["source_config"] || typeof body["source_config"] !== 'object' || Array.isArray(body["source_config"])) body["source_config"] = {};
      if (!body["source_config"]["resource_spec"] || typeof body["source_config"]["resource_spec"] !== 'object' || Array.isArray(body["source_config"]["resource_spec"])) body["source_config"]["resource_spec"] = {};
      body["source_config"]["resource_spec"]["annotations"] = d.source_config_resource_spec_annotations;
    }
    if (d.source_config_resource_spec_service_account_name !== undefined && d.source_config_resource_spec_service_account_name !== null && d.source_config_resource_spec_service_account_name !== '') {
      if (!body["source_config"] || typeof body["source_config"] !== 'object' || Array.isArray(body["source_config"])) body["source_config"] = {};
      if (!body["source_config"]["resource_spec"] || typeof body["source_config"]["resource_spec"] !== 'object' || Array.isArray(body["source_config"]["resource_spec"])) body["source_config"]["resource_spec"] = {};
      body["source_config"]["resource_spec"]["service_account_name"] = d.source_config_resource_spec_service_account_name;
    }
    if (d.source_config_resource_spec_image_pull_secrets !== undefined && d.source_config_resource_spec_image_pull_secrets !== null && d.source_config_resource_spec_image_pull_secrets !== '') {
      if (!body["source_config"] || typeof body["source_config"] !== 'object' || Array.isArray(body["source_config"])) body["source_config"] = {};
      if (!body["source_config"]["resource_spec"] || typeof body["source_config"]["resource_spec"] !== 'object' || Array.isArray(body["source_config"]["resource_spec"])) body["source_config"]["resource_spec"] = {};
      body["source_config"]["resource_spec"]["image_pull_secrets"] = d.source_config_resource_spec_image_pull_secrets;
    }
    if (d.source_config_resource_spec_volumes !== undefined && d.source_config_resource_spec_volumes !== null && d.source_config_resource_spec_volumes !== '') {
      if (!body["source_config"] || typeof body["source_config"] !== 'object' || Array.isArray(body["source_config"])) body["source_config"] = {};
      if (!body["source_config"]["resource_spec"] || typeof body["source_config"]["resource_spec"] !== 'object' || Array.isArray(body["source_config"]["resource_spec"])) body["source_config"]["resource_spec"] = {};
      body["source_config"]["resource_spec"]["volumes"] = d.source_config_resource_spec_volumes;
    }
    if (d.source_config_resource_spec_volume_mounts !== undefined && d.source_config_resource_spec_volume_mounts !== null && d.source_config_resource_spec_volume_mounts !== '') {
      if (!body["source_config"] || typeof body["source_config"] !== 'object' || Array.isArray(body["source_config"])) body["source_config"] = {};
      if (!body["source_config"]["resource_spec"] || typeof body["source_config"]["resource_spec"] !== 'object' || Array.isArray(body["source_config"]["resource_spec"])) body["source_config"]["resource_spec"] = {};
      body["source_config"]["resource_spec"]["volume_mounts"] = d.source_config_resource_spec_volume_mounts;
    }
    if (d.source_config_resource_spec_init_containers !== undefined && d.source_config_resource_spec_init_containers !== null && d.source_config_resource_spec_init_containers !== '') {
      if (!body["source_config"] || typeof body["source_config"] !== 'object' || Array.isArray(body["source_config"])) body["source_config"] = {};
      if (!body["source_config"]["resource_spec"] || typeof body["source_config"]["resource_spec"] !== 'object' || Array.isArray(body["source_config"]["resource_spec"])) body["source_config"]["resource_spec"] = {};
      body["source_config"]["resource_spec"]["init_containers"] = d.source_config_resource_spec_init_containers;
    }
    if (d.source_config_resource_spec_sidecars !== undefined && d.source_config_resource_spec_sidecars !== null && d.source_config_resource_spec_sidecars !== '') {
      if (!body["source_config"] || typeof body["source_config"] !== 'object' || Array.isArray(body["source_config"])) body["source_config"] = {};
      if (!body["source_config"]["resource_spec"] || typeof body["source_config"]["resource_spec"] !== 'object' || Array.isArray(body["source_config"]["resource_spec"])) body["source_config"]["resource_spec"] = {};
      body["source_config"]["resource_spec"]["sidecars"] = d.source_config_resource_spec_sidecars;
    }
    if (d.source_config_resource_spec_db_cpu !== undefined && d.source_config_resource_spec_db_cpu !== null && d.source_config_resource_spec_db_cpu !== '') {
      if (!body["source_config"] || typeof body["source_config"] !== 'object' || Array.isArray(body["source_config"])) body["source_config"] = {};
      if (!body["source_config"]["resource_spec"] || typeof body["source_config"]["resource_spec"] !== 'object' || Array.isArray(body["source_config"]["resource_spec"])) body["source_config"]["resource_spec"] = {};
      body["source_config"]["resource_spec"]["db_cpu"] = d.source_config_resource_spec_db_cpu;
    }
    if (d.source_config_resource_spec_db_cpu_limit !== undefined && d.source_config_resource_spec_db_cpu_limit !== null && d.source_config_resource_spec_db_cpu_limit !== '') {
      if (!body["source_config"] || typeof body["source_config"] !== 'object' || Array.isArray(body["source_config"])) body["source_config"] = {};
      if (!body["source_config"]["resource_spec"] || typeof body["source_config"]["resource_spec"] !== 'object' || Array.isArray(body["source_config"]["resource_spec"])) body["source_config"]["resource_spec"] = {};
      body["source_config"]["resource_spec"]["db_cpu_limit"] = d.source_config_resource_spec_db_cpu_limit;
    }
    if (d.source_config_resource_spec_db_memory_mb !== undefined && d.source_config_resource_spec_db_memory_mb !== null && d.source_config_resource_spec_db_memory_mb !== '') {
      if (!body["source_config"] || typeof body["source_config"] !== 'object' || Array.isArray(body["source_config"])) body["source_config"] = {};
      if (!body["source_config"]["resource_spec"] || typeof body["source_config"]["resource_spec"] !== 'object' || Array.isArray(body["source_config"]["resource_spec"])) body["source_config"]["resource_spec"] = {};
      body["source_config"]["resource_spec"]["db_memory_mb"] = d.source_config_resource_spec_db_memory_mb;
    }
    if (d.source_config_resource_spec_db_memory_limit_mb !== undefined && d.source_config_resource_spec_db_memory_limit_mb !== null && d.source_config_resource_spec_db_memory_limit_mb !== '') {
      if (!body["source_config"] || typeof body["source_config"] !== 'object' || Array.isArray(body["source_config"])) body["source_config"] = {};
      if (!body["source_config"]["resource_spec"] || typeof body["source_config"]["resource_spec"] !== 'object' || Array.isArray(body["source_config"]["resource_spec"])) body["source_config"]["resource_spec"] = {};
      body["source_config"]["resource_spec"]["db_memory_limit_mb"] = d.source_config_resource_spec_db_memory_limit_mb;
    }
    if (d.source_config_resource_spec_db_storage_gi !== undefined && d.source_config_resource_spec_db_storage_gi !== null && d.source_config_resource_spec_db_storage_gi !== '') {
      if (!body["source_config"] || typeof body["source_config"] !== 'object' || Array.isArray(body["source_config"])) body["source_config"] = {};
      if (!body["source_config"]["resource_spec"] || typeof body["source_config"]["resource_spec"] !== 'object' || Array.isArray(body["source_config"]["resource_spec"])) body["source_config"]["resource_spec"] = {};
      body["source_config"]["resource_spec"]["db_storage_gi"] = d.source_config_resource_spec_db_storage_gi;
    }
    if (d.source_config_resource_spec_db_max_connections !== undefined && d.source_config_resource_spec_db_max_connections !== null && d.source_config_resource_spec_db_max_connections !== '') {
      if (!body["source_config"] || typeof body["source_config"] !== 'object' || Array.isArray(body["source_config"])) body["source_config"] = {};
      if (!body["source_config"]["resource_spec"] || typeof body["source_config"]["resource_spec"] !== 'object' || Array.isArray(body["source_config"]["resource_spec"])) body["source_config"]["resource_spec"] = {};
      body["source_config"]["resource_spec"]["db_max_connections"] = d.source_config_resource_spec_db_max_connections;
    }
    if (d.source_config_listener_id !== undefined && d.source_config_listener_id !== null && d.source_config_listener_id !== '') {
      if (!body["source_config"] || typeof body["source_config"] !== 'object' || Array.isArray(body["source_config"])) body["source_config"] = {};
      body["source_config"]["listener_id"] = d.source_config_listener_id;
    }
    if (d.source_config_listener_config !== undefined && d.source_config_listener_config !== null && d.source_config_listener_config !== '') {
      if (!body["source_config"] || typeof body["source_config"] !== 'object' || Array.isArray(body["source_config"])) body["source_config"] = {};
      body["source_config"]["listener_config"] = d.source_config_listener_config;
    }
    if (d.source_config_listener_config_k8s_namespace !== undefined && d.source_config_listener_config_k8s_namespace !== null && d.source_config_listener_config_k8s_namespace !== '') {
      if (!body["source_config"] || typeof body["source_config"] !== 'object' || Array.isArray(body["source_config"])) body["source_config"] = {};
      if (!body["source_config"]["listener_config"] || typeof body["source_config"]["listener_config"] !== 'object' || Array.isArray(body["source_config"]["listener_config"])) body["source_config"]["listener_config"] = {};
      body["source_config"]["listener_config"]["k8s_namespace"] = d.source_config_listener_config_k8s_namespace;
    }
    if (d.source_config_install_command !== undefined && d.source_config_install_command !== null && d.source_config_install_command !== '') {
      if (!body["source_config"] || typeof body["source_config"] !== 'object' || Array.isArray(body["source_config"])) body["source_config"] = {};
      body["source_config"]["install_command"] = d.source_config_install_command;
    }
    if (d.source_config_build_command !== undefined && d.source_config_build_command !== null && d.source_config_build_command !== '') {
      if (!body["source_config"] || typeof body["source_config"] !== 'object' || Array.isArray(body["source_config"])) body["source_config"] = {};
      body["source_config"]["build_command"] = d.source_config_build_command;
    }
    if (d.source_revision_config !== undefined && d.source_revision_config !== null && d.source_revision_config !== '') {
      body["source_revision_config"] = d.source_revision_config;
    }
    if (d.source_revision_config_repo_ref !== undefined && d.source_revision_config_repo_ref !== null && d.source_revision_config_repo_ref !== '') {
      if (!body["source_revision_config"] || typeof body["source_revision_config"] !== 'object' || Array.isArray(body["source_revision_config"])) body["source_revision_config"] = {};
      body["source_revision_config"]["repo_ref"] = d.source_revision_config_repo_ref;
    }
    if (d.source_revision_config_langgraph_config_path !== undefined && d.source_revision_config_langgraph_config_path !== null && d.source_revision_config_langgraph_config_path !== '') {
      if (!body["source_revision_config"] || typeof body["source_revision_config"] !== 'object' || Array.isArray(body["source_revision_config"])) body["source_revision_config"] = {};
      body["source_revision_config"]["langgraph_config_path"] = d.source_revision_config_langgraph_config_path;
    }
    if (d.source_revision_config_image_uri !== undefined && d.source_revision_config_image_uri !== null && d.source_revision_config_image_uri !== '') {
      if (!body["source_revision_config"] || typeof body["source_revision_config"] !== 'object' || Array.isArray(body["source_revision_config"])) body["source_revision_config"] = {};
      body["source_revision_config"]["image_uri"] = d.source_revision_config_image_uri;
    }
    if (d.source_revision_config_source_tarball_path !== undefined && d.source_revision_config_source_tarball_path !== null && d.source_revision_config_source_tarball_path !== '') {
      if (!body["source_revision_config"] || typeof body["source_revision_config"] !== 'object' || Array.isArray(body["source_revision_config"])) body["source_revision_config"] = {};
      body["source_revision_config"]["source_tarball_path"] = d.source_revision_config_source_tarball_path;
    }
    if (d.secrets !== undefined && d.secrets !== null && d.secrets !== '') {
      body["secrets"] = d.secrets;
    }
    if (d.secret_references !== undefined && d.secret_references !== null && d.secret_references !== '') {
      body["secret_references"] = d.secret_references;
    }

    log('Requête en cours...');
    const res = await utils.providerRequest(opts, reqPath, { method: 'PATCH', query, body, headers });
    if (!res.ok) return { ok: false, error: res.error, status: res.status, details: res.details };

    const r = res.data || {};
    return {
      ok: true,
      id: r.id || r.uuid || r.key || '',
      name: r.name || r.title || '',
      url: r.url || r.html_url || '',
      status: r.status || r.state || '',
      created_at: r.created_at || r.createdAt || '',
      updated_at: r.updated_at || r.updatedAt || '',
      raw: r
    };
  }
};

