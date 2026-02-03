import json
import urllib.request
import concurrent.futures

print("DEBUG: Included imports")

SUPABASE_URL = "https://peoyosdnthdpnhejivqo.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlb3lvc2RudGhkcG5oZWppdnFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyMTc4OTksImV4cCI6MjA4Mjc5Mzg5OX0.h0CnHfmrVc7k8MlGQKA0puv1ncKn9tBGXLgMQ1alGD8"

ids = [
    "ffae3445-e2cc-42a5-9103-97dd36254cf1", "4d503b0e-d6d5-4376-a066-40d53c42c4f7", "6b965d5e-ad75-49c7-b815-39e739182663",
    "b3c692ad-0b16-44eb-ade1-717ccf92c13c", "96727e05-d978-49f9-80e6-6b84ad4981a1", "c2932d6d-cd40-4d19-b06f-2337d13ccc6e",
    "04e7982a-c044-4e33-af2c-d86198da5bba", "ef050f87-92f3-41c1-b9b2-5cba832289ae", "92889da7-54e0-4977-8a7b-4d6db03fca61",
    "fb0aeb4b-e47a-45dc-8898-1e106bc518ba", "b85a7a68-a646-4a6f-a67b-67ce05e13089", "628da590-0701-4bd0-b267-72713c5b6336",
    "6542fabe-9147-4a74-bac2-c800b79249f9", "d8658367-99e6-483e-9653-ce8ed6c37577", "314898b3-9874-49a9-b2b6-b0d26b1a3961",
    "71ff5bbe-79c0-4cff-b804-963de5638fae", "2739e771-34e3-4c3e-91e5-36f0243037fd", "90cb150e-1a90-403c-90c4-14c6c881f769",
    "8c1efbdb-bec7-4ea8-9bac-b929c2bee127", "854ab455-c90f-4183-8d6a-e58f608cf1bf", "adcbece7-435b-4456-8fa6-b05d0405f2bb",
    "c7fe6815-b32f-441d-9aae-0bb4d050d87a", "42a38b99-3eda-443d-bc9b-1e3a4f60b731", "5f039302-b594-41f5-b2b6-7d62c8a035c8",
    "7cc71c8c-8b3c-426e-ae5b-57e6dbdc85cb", "a245c497-f8e0-4446-a23a-00601f5ef685", "5caaef68-dd8f-4a90-9d6c-66ff304dcf28",
    "17355e67-f109-46fa-a145-7db490e87091", "a6313cd1-4ed8-4f9b-bd36-74f32fe187f0", "d474636b-158b-4be3-a763-e340c8970de7",
    "aa37124a-eea5-47ed-998b-6974f71089c1", "83e62419-42bb-4837-8f1a-bed96072f49b", "9105422b-8d7c-4539-8dbb-1fb23525b7e6",
    "e97e29e2-8430-4ba8-9a6b-cd9af224ccbc", "f213ac06-2386-4cb0-b7f6-728f505d093a", "0369fb7b-ab5e-4968-a407-41b8f843ea04",
    "65b6da5e-1c1c-4209-b1c2-99df6a70b336", "480622d2-5181-45f8-8db3-49283a1c368b", "5f80f83e-9f2a-4edc-ac9f-bfa3a8948113",
    "75f91a4e-8a6f-4d66-9570-c2dd37c98337", "90929ab9-c066-4511-89ea-6f29c66c0a34", "0c79b04c-10cc-4433-9882-e46d9637dec5",
    "f1ad4628-c292-47ee-a4d6-9b114abd1485", "4e275561-dab7-4340-8a41-7d469e5c1155", "75384f2b-0475-4acf-a1c0-bf391e22072b",
    "9817b182-1eff-41dc-a673-1a9b56515ec5", "0998eb1b-ef14-4be2-8340-8eddf68cf673", "475e5506-2838-44dc-9e95-a0b9ad0f2d80",
    "a5673770-5b23-4a0a-8880-d131487fadd3", "ac1e02a6-c574-41bd-a770-239c2b93f3de"
]

print(f"DEBUG: Defined {len(ids)} ids")

def invoke(aid):
    url = f"{SUPABASE_URL}/functions/v1/extract-content"
    headers = {
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }
    data = json.dumps({"alert_id": aid, "translate": False}).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            return aid, res.getcode(), None
    except Exception as e:
        return aid, 0, str(e)

print("DEBUG: Starting executor")

with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
    futures = {executor.submit(invoke, i): i for i in ids}
    for f in concurrent.futures.as_completed(futures):
        aid, status, err = f.result()
        print(f"Finished {aid}: {status} {err}")

print("DEBUG: Done")
