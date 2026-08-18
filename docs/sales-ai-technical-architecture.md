# 销冠经验萃取与智能赋能平台技术架构图

以下架构图适合直接放入技术方案、概要设计或项目建设文档中。图中采用分层架构表达，纵向体现从用户入口到基础设施的调用链路，横向体现安全合规、运维监控和 API 网关等公共支撑能力。

```mermaid
flowchart TB
  %% =========================
  %% User Interaction Layer
  %% =========================
  subgraph L1["用户交互层"]
    Web["Web 端"]
    WeCom["企业微信"]
    VoiceUI["语音交互"]
  end

  %% =========================
  %% Business Application Layer
  %% =========================
  subgraph L2["业务应用层"]
    MarketingKB["营销知识库"]
    CustomerRepo["客户档案库"]
    CustomerProfile["客户画像"]
    VisitSim["拜访模拟"]
    PreVisit["预拜访档案"]
    ChampionEnablement["销冠经验萃取与智能赋能模块"]
  end

  %% =========================
  %% Intelligent Engine Layer
  %% =========================
  subgraph L3["智能引擎层"]
    LLM["大模型推理引擎"]
    RAG["RAG 引擎"]
    Agents["多智能体调度引擎"]
    Speech["语音引擎 ASR/TTS"]
    Scene["场景识别与模式切换"]
    ChampionMining["销冠经验萃取引擎"]
    Scoring["智能评分引擎"]
    ComplianceEngine["合规校验引擎"]
  end

  %% =========================
  %% Data Resource Layer
  %% =========================
  subgraph L4["数据资源层"]
    AcademicDomain["学术知识域"]
    RetailDomain["零售知识域"]
    ChampionLake["销冠经验数据湖"]
    CustomerDW["客户数据仓库"]
    VectorDB["向量数据库"]
    RDB["关系数据库"]
    GraphDB["图数据库"]
  end

  %% =========================
  %% Infrastructure Layer
  %% =========================
  subgraph L5["基础设施层"]
    GPU["GPU 集群"]
    Storage["存储系统"]
    Network["网络架构"]
    SecurityInfra["安全设施"]
  end

  %% =========================
  %% Cross-cutting Capabilities
  %% =========================
  subgraph GX["横向支撑体系"]
    APIGW["API 网关"]
    SecurityGov["安全合规体系"]
    Observability["运维监控体系"]
  end

  %% User entry
  Web --> APIGW
  WeCom --> APIGW
  VoiceUI --> APIGW

  %% Gateway to applications
  APIGW --> MarketingKB
  APIGW --> CustomerRepo
  APIGW --> CustomerProfile
  APIGW --> VisitSim
  APIGW --> PreVisit
  APIGW --> ChampionEnablement

  %% Business to intelligent engines
  MarketingKB --> RAG
  CustomerRepo --> RAG
  CustomerProfile --> Agents
  VisitSim --> Agents
  PreVisit --> Scene
  ChampionEnablement --> ChampionMining

  ChampionEnablement --> LLM
  ChampionEnablement --> RAG
  ChampionEnablement --> Agents
  VoiceUI --> Speech
  Speech --> LLM

  %% Engine orchestration
  Agents --> LLM
  Agents --> RAG
  Agents --> Scoring
  Agents --> ComplianceEngine
  Scene --> Agents
  ChampionMining --> Scoring
  ComplianceEngine --> SecurityGov

  %% Data access
  RAG --> VectorDB
  RAG --> AcademicDomain
  RAG --> RetailDomain
  ChampionMining --> ChampionLake
  CustomerProfile --> CustomerDW
  CustomerRepo --> CustomerDW
  Scoring --> RDB
  Agents --> GraphDB
  ComplianceEngine --> RDB

  %% Infrastructure support
  LLM --> GPU
  RAG --> Storage
  VectorDB --> Storage
  RDB --> Storage
  GraphDB --> Storage
  APIGW --> Network
  SecurityGov --> SecurityInfra
  Observability --> Network

  %% Cross-cutting governance and monitoring
  SecurityGov -.-> L1
  SecurityGov -.-> L2
  SecurityGov -.-> L3
  SecurityGov -.-> L4
  SecurityGov -.-> L5

  Observability -.-> APIGW
  Observability -.-> L2
  Observability -.-> L3
  Observability -.-> L4
  Observability -.-> L5

  %% Styles
  classDef layer fill:#f7f9fc,stroke:#7a8aa0,stroke-width:1px,color:#1f2937;
  classDef app fill:#e8f4ff,stroke:#3b82f6,color:#0f172a;
  classDef engine fill:#eef8ef,stroke:#22a06b,color:#0f172a;
  classDef data fill:#fff6e5,stroke:#f59e0b,color:#0f172a;
  classDef infra fill:#f3edf9,stroke:#8b5cf6,color:#0f172a;
  classDef gov fill:#fff1f2,stroke:#e11d48,color:#0f172a;

  class L1,L2,L3,L4,L5,GX layer;
  class Web,WeCom,VoiceUI,MarketingKB,CustomerRepo,CustomerProfile,VisitSim,PreVisit,ChampionEnablement app;
  class LLM,RAG,Agents,Speech,Scene,ChampionMining,Scoring,ComplianceEngine engine;
  class AcademicDomain,RetailDomain,ChampionLake,CustomerDW,VectorDB,RDB,GraphDB data;
  class GPU,Storage,Network,SecurityInfra infra;
  class APIGW,SecurityGov,Observability gov;
```

## 架构说明

该平台采用五层架构与三类横向支撑能力组合：

- 用户交互层：面向销售、管理者和运营人员，提供 Web、企业微信和语音交互入口。
- 业务应用层：承载营销知识库、客户档案、客户画像、拜访模拟、预拜访档案等核心业务场景。
- 智能引擎层：通过大模型推理、RAG、多智能体调度、语音识别合成、场景识别、经验萃取、智能评分和合规校验完成智能化能力编排。
- 数据资源层：沉淀学术知识、零售知识、销冠经验、客户数据，并通过向量数据库、关系数据库和图数据库支撑检索、分析与推理。
- 基础设施层：提供 GPU 算力、存储、网络和安全设施，保障平台稳定运行。
- 横向支撑体系：API 网关统一接入与流量治理，安全合规体系覆盖全链路权限、审计、脱敏与内容合规，运维监控体系覆盖服务、模型、数据和基础设施状态。

