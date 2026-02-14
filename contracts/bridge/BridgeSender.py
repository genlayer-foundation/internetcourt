# v0.1.0
# { "Depends": "py-genlayer:latest" }
from backend.node.genvm.icontract import IContract
from backend.node.genvm.std import *
from backend.node.genvm.types import *

class MessageData:
    target_chain_id: int
    target_contract: str
    data: bytes

class BridgeSender(gl.Contract):
    messages: TreeMap[str, MessageData]

    def __init__(self):
        self.messages = TreeMap()

    @gl.public.write
    def send_message(
        self,
        target_chain_id: int,
        target_contract: str,
        data: bytes
    ) -> str:
        hasher = Keccak256()
        hasher.update(datetime.now().isoformat().encode())
        hasher.update(gl.message.sender_address.as_bytes)
        hasher.update(target_contract.encode())
        hasher.update(data)
        message_hash = hasher.digest().hex()

        # ABI-encode bridge envelope: (uint32 srcChainId, address sender, address target, bytes data)
        abi = [u32, Address, Address, bytes]
        encoder = genvm_eth.MethodEncoder("", abi, bool)
        message_data = [
            61998,                          # GenLayer chain ID
            gl.message.sender_address,
            Address(target_contract),
            data
        ]
        message_bytes = encoder.encode_call(message_data)[4:]  # Strip method selector

        self.messages[message_hash] = MessageData(
            target_chain_id,
            target_contract,
            message_bytes
        )
        return message_hash

    @gl.public.view
    def get_message_hashes(self) -> list[str]:
        return list(self.messages.keys())

    @gl.public.view
    def get_message(self, message_hash: str) -> MessageData:
        return self.messages[message_hash]
