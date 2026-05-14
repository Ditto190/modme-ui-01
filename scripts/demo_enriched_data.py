"""Quick demonstration of enriched chat.json data."""
import json

import pandas as pd

# Load enriched dataset
df = pd.read_csv('datasets/demo_output.csv')

print("=" * 70)
print("COPILOT OBSERVABILITY - ENRICHED DATASET DEMONSTRATION")
print("=" * 70)
print(f"\n📊 Dataset Size: {len(df)} interactions")
print(f"📈 Total Columns: {len(df.columns)} fields")
print("   - Original fields: 40")
print("   - Categorization: 5 (task, complexity, outcome, MCP, response type)")
print("   - Annotations: 4 (latency, tool efficiency, token budget, completeness)")

print("\n" + "=" * 70)
print("SAMPLE INTERACTION #1")
print("=" * 70)

row = df.iloc[0]

print(f"\n🆔 Request ID: {row['request_id']}")
print(f"📅 Timestamp: {row['timestamp']}")
print(f"🤖 Model: {row['model_id']}")
print(f"🎯 Agent: {row['agent_name']}")
print(f"#️⃣  Turn: {row['turn_index']}")

print("\n💬 USER MESSAGE (first 100 chars):")
print(f"   {str(row['user_message'])[:100]}...")

print("\n📝 ASSISTANT RESPONSE (first 100 chars):")
print(f"   {str(row['assistant_response'])[:100]}...")

print("\n🧠 THINKING (first 100 chars):")
thinking = str(row['thinking'])
if thinking != 'nan':
    print(f"   {thinking[:100]}...")
else:
    print("   (none)")

print("\n" + "-" * 70)
print("TOKEN BREAKDOWN")
print("-" * 70)
print(f"   System Instructions: {row['token_pct_system_instructions']:.1f}%")
print(f"   Tool Definitions:    {row['token_pct_tool_definitions']:.1f}%")
print(f"   User Messages:       {row['token_pct_messages']:.1f}%")
print(f"   Files:               {row['token_pct_files']:.1f}%")
print(f"   Tool Results:        {row['token_pct_tool_results']:.1f}%")

total_overhead = row['token_pct_system_instructions'] + row['token_pct_tool_definitions']
print(f"\n   ⚠️  OVERHEAD: {total_overhead:.1f}% (system + tools)")
print(f"   ✅ USER CONTENT: {row['token_pct_messages']:.1f}%")

print("\n" + "-" * 70)
print("TOOL EXECUTION")
print("-" * 70)

# Handle tools_available and tools_invoked safely
tools_avail = row['tools_available']
tools_inv = row['tools_invoked']

if pd.notna(tools_avail):
    try:
        tools_avail_list = eval(tools_avail) if isinstance(tools_avail, str) else tools_avail
        avail_count = len(tools_avail_list) if isinstance(tools_avail_list, list) else 0
    except:
        avail_count = 0
else:
    avail_count = 0

if pd.notna(tools_inv):
    try:
        tools_inv_list = eval(tools_inv) if isinstance(tools_inv, str) else tools_inv
        inv_count = len(tools_inv_list) if isinstance(tools_inv_list, list) else 0
    except:
        inv_count = 0
else:
    inv_count = 0

print(f"   Tools Available: {avail_count}")
print(f"   Tools Invoked:   {inv_count}")
print(f"   Call Rounds:     {row['tool_call_rounds_count']}")

print("\n" + "-" * 70)
print("AUTO-CATEGORIZATION")
print("-" * 70)
print(f"   📋 Task Type:       {row['category_task']}")
print(f"   🎚️  Complexity:      {row['category_complexity']}")
print(f"   ✅ Outcome:         {row['category_outcome']}")
print(f"   🔌 MCP Usage:       {row['category_mcp_usage']}")
print(f"   💡 Response Type:   {row['category_response_type']}")

print("\n" + "-" * 70)
print("QUALITY ANNOTATIONS (0.0-1.0 scores)")
print("-" * 70)

# Parse JSON annotations
lat = json.loads(row['annotation_latency'])
print(f"   ⏱️  Latency:           {lat['label']:15} (score: {lat['score']:.2f})")
print(f"      {lat['explanation']}")

tool_eff = json.loads(row['annotation_tool_efficiency'])
print(f"\n   🔧 Tool Efficiency:   {tool_eff['label']:15} (score: {tool_eff['score']:.2f})")
print(f"      {tool_eff['explanation']}")

token_health = json.loads(row['annotation_token_budget'])
print(f"\n   💰 Token Budget:      {token_health['label']:15} (score: {token_health['score']:.2f})")
print(f"      {token_health['explanation']}")

completeness = json.loads(row['annotation_response_completeness'])
print(f"\n   📊 Completeness:      {completeness['label']:15} (score: {completeness['score']:.2f})")
print(f"      {completeness['explanation']}")

print("\n" + "=" * 70)
print("CATEGORY DISTRIBUTION (all 10 interactions)")
print("=" * 70)

print("\n📋 Task Types:")
for task, count in df['category_task'].value_counts().items():
    print(f"   {task:20} {count:2} interactions")

print("\n🎚️  Complexity:")
for comp, count in df['category_complexity'].value_counts().items():
    print(f"   {comp:20} {count:2} interactions")

print("\n✅ Outcomes:")
for outcome, count in df['category_outcome'].value_counts().items():
    print(f"   {outcome:20} {count:2} interactions")

print("\n🔌 MCP Usage:")
for mcp, count in df['category_mcp_usage'].value_counts().items():
    print(f"   {mcp:20} {count:2} interactions")

print("\n💡 Response Types:")
for resp, count in df['category_response_type'].value_counts().items():
    print(f"   {resp:20} {count:2} interactions")

print("\n" + "=" * 70)
print("AVERAGE QUALITY SCORES")
print("=" * 70)

# Parse all annotations and calculate averages
latency_scores = [json.loads(row['annotation_latency'])['score'] for _, row in df.iterrows()]
tool_scores = [json.loads(row['annotation_tool_efficiency'])['score'] for _, row in df.iterrows()]
token_scores = [json.loads(row['annotation_token_budget'])['score'] for _, row in df.iterrows()]
complete_scores = [json.loads(row['annotation_response_completeness'])['score'] for _, row in df.iterrows()]

print(f"\n   ⏱️  Latency:         {sum(latency_scores)/len(latency_scores):.3f}")
print(f"   🔧 Tool Efficiency: {sum(tool_scores)/len(tool_scores):.3f}")
print(f"   💰 Token Budget:    {sum(token_scores)/len(token_scores):.3f}")
print(f"   📊 Completeness:    {sum(complete_scores)/len(complete_scores):.3f}")

print("\n" + "=" * 70)
print("✅ DEMONSTRATION COMPLETE")
print("=" * 70)
print("\n📁 Full dataset saved to: datasets/demo_output.csv")
print("📊 Ready for Phoenix upload or further analysis!")
print("\nNext steps:")
print("  1. npm run phoenix:start    # Start Phoenix")
print("  2. npm run phoenix:ui        # Open Phoenix UI")
print("  3. npm run copilot:batch-upload  # Upload dataset")
