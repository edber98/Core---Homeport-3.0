module.exports = {
  async crewai_health_ping() {
    return { ok: true, status: 200, message: "pong", raw: { service: "crewai" } };
  }
};
