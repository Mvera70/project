import { describe, expect, it } from 'vitest';
import { buildReaderPacket } from '../../tools/reader-packet-content';

describe('paquete ciego del hito 0 · §9.5', () => {
  it('entrega solo tres crónicas anónimas y la pregunta acordada', () => {
    const packet = buildReaderPacket();
    expect(packet.map((file) => file.name)).toEqual([
      'chronicle-a.txt', 'chronicle-b.txt', 'chronicle-c.txt', 'reader-question.txt',
    ]);

    const chronicles = packet.slice(0, 3).map((file) => file.content);
    expect(new Set(chronicles).size).toBe(3);
    for (const content of chronicles) {
      expect(content.split('\n')[0]).toMatch(/^  — Year \d+ —$/);
      expect(content).not.toMatch(/^(seed|policy|final population)\s*:/im);
      expect(content.split('\n').length).toBeGreaterThan(50);
    }

    expect(packet[3]?.content).toBe(
      'Read chronicle-a.txt, chronicle-b.txt and chronicle-c.txt in any order.\n\nHow do these three villages differ?\n',
    );
  });
});
