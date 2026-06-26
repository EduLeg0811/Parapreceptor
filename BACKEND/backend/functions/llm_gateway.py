from __future__ import annotations

from typing import Any

import requests

OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses"


def _extract_response_text(payload: dict[str, Any]) -> str:
    chunks: list[str] = []
    for item in payload.get("output", []):
        for block in item.get("content", []):
            block_type = str(block.get("type") or "").strip().lower()
            if block_type in {"output_text", "text"}:
                text_value = block.get("text")
                if isinstance(text_value, dict):
                    text = str(text_value.get("value") or "").strip()
                else:
                    text = str(text_value or "").strip()
                if text:
                    chunks.append(text)
        # fallback por item, caso content venha vazio em alguns formatos
        item_text = item.get("text")
        if isinstance(item_text, dict):
            text = str(item_text.get("value") or "").strip()
            if text:
                chunks.append(text)
        elif isinstance(item_text, str):
            text = item_text.strip()
            if text:
                chunks.append(text)
    if chunks:
        return "\n".join(chunks).strip()
    output_text = payload.get("output_text")
    if isinstance(output_text, list):
        out_parts = [str(x).strip() for x in output_text if str(x).strip()]
        if out_parts:
            return "\n".join(out_parts).strip()
    if isinstance(output_text, dict):
        text = str(output_text.get("value") or "").strip()
        if text:
            return text
    return str(output_text or "").strip()


def _to_responses_input(messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    converted: list[dict[str, Any]] = []
    for msg in messages:
        role = str(msg.get("role") or "user")
        content = str(msg.get("content") or "")
        # Usa content como string para compatibilidade entre papeis
        # (user/system/assistant) na Responses API.
        converted.append({"role": role, "content": content})
    return converted


def _is_gpt5_family(model: str) -> bool:
    m = (model or "").strip().lower()
    return m.startswith("gpt-5")


def _dedupe_clean_strings(values: list[str] | None) -> list[str]:
    return list(dict.fromkeys(str(value or "").strip() for value in (values or []) if str(value or "").strip()))


def _merge_system_prompt(input_messages: list[dict[str, Any]], system_prompt: str) -> list[dict[str, Any]]:
    first_is_system = input_messages and str(input_messages[0].get("role") or "").lower() in {"system", "developer"}
    base_system = (system_prompt or "").strip()
    if not base_system:
        return input_messages
    if first_is_system:
        previous = str(input_messages[0].get("content") or "")
        input_messages[0]["content"] = f"{base_system}\n\n{previous}" if previous else base_system
        return input_messages
    return [{"role": "system", "content": base_system}, *input_messages]


def _attach_input_files_to_last_user_message(
    input_messages: list[dict[str, Any]],
    input_file_ids: list[str],
) -> list[dict[str, Any]]:
    if not input_file_ids:
        return input_messages
    last_user_index = -1
    for idx in range(len(input_messages) - 1, -1, -1):
        if str(input_messages[idx].get("role") or "").lower() == "user":
            last_user_index = idx
            break
    if last_user_index < 0:
        return input_messages
    last_user_message = input_messages[last_user_index]
    last_user_content = last_user_message.get("content")
    last_user_text = last_user_content if isinstance(last_user_content, str) else str(last_user_content or "")
    multipart_content: list[dict[str, Any]] = [{"type": "input_file", "file_id": file_id} for file_id in input_file_ids]
    multipart_content.append({"type": "input_text", "text": last_user_text})
    last_user_message["content"] = multipart_content
    return input_messages


def _build_tools(
    *,
    vector_store_ids: list[str],
    vector_max_results: int,
    tools: list[dict[str, Any]] | None,
) -> list[dict[str, Any]]:
    normalized_tools = [tool for tool in (tools or []) if isinstance(tool, dict) and tool.get("type")]
    passthrough_tools = [tool for tool in normalized_tools if str(tool.get("type") or "").strip().lower() != "file_search"]
    if vector_store_ids:
        passthrough_tools.append(
            {
                "type": "file_search",
                "vector_store_ids": vector_store_ids,
                "max_num_results": max(1, min(int(vector_max_results or 5), 20)),
            }
        )
    return passthrough_tools


def _extract_reference_label(item: dict[str, Any]) -> str:
    attrs = item.get("attributes") if isinstance(item.get("attributes"), dict) else {}
    attrs = attrs if isinstance(attrs, dict) else {}
    candidates = [
        item.get("filename"),
        item.get("file_name"),
        item.get("title"),
        item.get("file_id"),
        attrs.get("filename"),
        attrs.get("file_name"),
        attrs.get("title"),
        attrs.get("document_name"),
        attrs.get("source"),
        attrs.get("book"),
    ]
    for candidate in candidates:
        text = str(candidate or "").strip()
        if text:
            return text
    return ""


def _extract_rag_references(payload: dict[str, Any]) -> list[str]:
    references: list[str] = []
    for item in payload.get("output", []):
        if not isinstance(item, dict):
            continue
        item_type = str(item.get("type") or "").strip().lower()
        if item_type == "file_search_call":
            for result in item.get("results", []):
                if not isinstance(result, dict):
                    continue
                label = _extract_reference_label(result)
                if label:
                    references.append(label)
        for block in item.get("content", []):
            if not isinstance(block, dict):
                continue
            for annotation in block.get("annotations", []):
                if not isinstance(annotation, dict):
                    continue
                if str(annotation.get("type") or "").strip().lower() != "file_citation":
                    continue
                label = _extract_reference_label(annotation)
                if label:
                    references.append(label)
    return list(dict.fromkeys(references))


def _build_responses_request(
    *,
    model: str,
    input_messages: list[dict[str, Any]],
    previous_response_id: str | None,
    max_output_tokens: int | None,
    gpt5_verbosity: str | None,
    gpt5_effort: str | None,
    temperature: float | None,
    tools: list[dict[str, Any]],
) -> dict[str, Any]:
    request_json: dict[str, Any] = {
        "model": model,
        "input": input_messages,
    }
    if previous_response_id:
        request_json["previous_response_id"] = previous_response_id
    if max_output_tokens is not None:
        request_json["max_output_tokens"] = max_output_tokens
    if tools:
        request_json["tools"] = tools
        if any(str(tool.get("type") or "").strip().lower() == "file_search" for tool in tools if isinstance(tool, dict)):
            request_json["include"] = ["file_search_call.results"]
    if _is_gpt5_family(model):
        if gpt5_verbosity:
            request_json["text"] = {"verbosity": gpt5_verbosity}
        if gpt5_effort:
            request_json["reasoning"] = {"effort": gpt5_effort}
    elif temperature is not None:
        request_json["temperature"] = temperature
    return request_json


def execute_llm_request(
    *,
    api_key: str,
    model: str,
    messages: list[dict[str, Any]],
    previous_response_id: str | None = None,
    system_prompt: str,
    temperature: float | None = None,
    max_output_tokens: int | None = None,
    gpt5_verbosity: str | None = None,
    gpt5_effort: str | None = None,
    tools: list[dict[str, Any]] | None = None,
    vector_store_ids: list[str] | None = None,
    input_file_ids: list[str] | None = None,
    vector_max_results: int = 5,
    timeout: int = 60,
) -> dict[str, Any]:
    input_messages = _to_responses_input(messages)
    if not input_messages:
        input_messages = [{"role": "user", "content": ""}]
    input_messages = _merge_system_prompt(input_messages, system_prompt)
    input_messages = _attach_input_files_to_last_user_message(input_messages, _dedupe_clean_strings(input_file_ids))
    request_tools = _build_tools(
        vector_store_ids=_dedupe_clean_strings(vector_store_ids),
        vector_max_results=vector_max_results,
        tools=tools,
    )
    request_json = _build_responses_request(
        model=model,
        input_messages=input_messages,
        previous_response_id=previous_response_id,
        max_output_tokens=max_output_tokens,
        gpt5_verbosity=gpt5_verbosity,
        gpt5_effort=gpt5_effort,
        temperature=temperature,
        tools=request_tools,
    )

    upstream = requests.post(
        OPENAI_RESPONSES_URL,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"},
        json=request_json,
        timeout=timeout,
    )
    upstream.raise_for_status()
    payload = upstream.json()
    return {
        "content": _extract_response_text(payload),
        "references": _extract_rag_references(payload),
        "request": request_json,
        "raw": payload,
    }
