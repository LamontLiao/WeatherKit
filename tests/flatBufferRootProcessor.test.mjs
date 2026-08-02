import assert from "node:assert/strict";
import test from "node:test";
import { Builder, ByteBuffer } from "flatbuffers";
import { FlatBufferRootProcessor } from "../packages/flatbuffer-root/src/index.mjs";

class Leaf {
    bb = null;
    bb_pos = 0;
    __init(position, byteBuffer) {
        this.bb_pos = position;
        this.bb = byteBuffer;
        return this;
    }
    value() {
        const offset = this.bb.__offset(this.bb_pos, 4);
        return offset ? this.bb.readInt32(this.bb_pos + offset) : 0;
    }
}

class Root {
    bb = null;
    bb_pos = 0;
    __init(position, byteBuffer) {
        this.bb_pos = position;
        this.bb = byteBuffer;
        return this;
    }
    alpha(table) {
        const offset = this.bb.__offset(this.bb_pos, 4);
        return offset ? (table ?? new Leaf()).__init(this.bb.__indirect(this.bb_pos + offset), this.bb) : null;
    }
    static addAlpha(builder, offset) {
        builder.addFieldOffset(0, offset, 0);
    }
}

const processor = new FlatBufferRootProcessor({
    name: "TestRoot",
    rootClass: Root,
    configurableRootNames: ["alpha"],
    codecs: {
        alpha: {
            tableClass: Leaf,
            decode: table => ({ value: table.value() }),
            encode: (builder, json) => createLeaf(builder, json.value),
        },
    },
});

test("generic root processor replaces a local-schema slot and preserves opaque iOS 27 slots", () => {
    const source = createRoot([
        [0, builder => createLeaf(builder, 11)],
        [12, builder => createContainer(builder, createLeaf(builder, 1200))],
        [15, builder => createContainer(builder, createLeaf(builder, 1500))],
    ]);
    const output = processor.encode(new ByteBuffer(source), { alpha: { value: 22 } });
    const byteBuffer = new ByteBuffer(output);
    const root = byteBuffer.__indirect(byteBuffer.position());

    assert.deepEqual(processor.decode(new ByteBuffer(output), ["alpha"]), { alpha: { value: 22 } });
    assert.equal(readLeaf(byteBuffer, tableAt(byteBuffer, tableAt(byteBuffer, root, 12), 0)), 1200);
    assert.equal(readLeaf(byteBuffer, tableAt(byteBuffer, tableAt(byteBuffer, root, 15), 0)), 1500);
});

test("generic root processor only filters local configurable names", () => {
    assert.deepEqual(processor.filterRootNames(["future", "alpha"], []), ["future"]);
    assert.deepEqual(processor.filterRootNames(["future", "alpha"], ["alpha"]), ["future", "alpha"]);
});

function createRoot(entries) {
    const builder = new Builder(256);
    const offsets = entries.map(([slot, create]) => [slot, create(builder)]);
    builder.startObject(16);
    for (const [slot, offset] of offsets) builder.addFieldOffset(slot, offset, 0);
    const root = builder.endObject();
    builder.finish(root);
    return builder.asUint8Array().slice();
}

function createLeaf(builder, value) {
    builder.startObject(1);
    builder.addFieldInt32(0, value, 0);
    return builder.endObject();
}

function createContainer(builder, nestedOffset) {
    builder.startObject(1);
    builder.addFieldOffset(0, nestedOffset, 0);
    return builder.endObject();
}

function tableAt(byteBuffer, table, slot) {
    const offset = byteBuffer.__offset(table, 4 + slot * 2);
    return offset ? byteBuffer.__indirect(table + offset) : 0;
}

function readLeaf(byteBuffer, table) {
    const offset = byteBuffer.__offset(table, 4);
    return offset ? byteBuffer.readInt32(table + offset) : 0;
}
