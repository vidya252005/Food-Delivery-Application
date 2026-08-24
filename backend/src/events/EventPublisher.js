/**
 * Event-driven decoupling (LLD sections 28–29).
 * OrderService publishes; observers react (notifications, sockets, delivery).
 */
class EventPublisher {
  constructor() {
    this.observers = [];
  }

  subscribe(observer) {
    this.observers.push(observer);
  }

  async publish(event) {
    await Promise.all(
      this.observers.map((obs) => Promise.resolve(obs.handle(event)).catch((err) => {
        console.error(`Observer error for ${event.type}:`, err.message);
      }))
    );
  }
}

const eventPublisher = new EventPublisher();

module.exports = { EventPublisher, eventPublisher };
