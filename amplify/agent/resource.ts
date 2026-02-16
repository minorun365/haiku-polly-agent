import * as path from 'path';
import * as url from 'url';
import * as cdk from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as agentcore from '@aws-cdk/aws-bedrock-agentcore-alpha';
import { ContainerImageBuild } from 'deploy-time-build';
import { Platform } from 'aws-cdk-lib/aws-ecr-assets';
import type { IUserPool, IUserPoolClient } from 'aws-cdk-lib/aws-cognito';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface VoiceAgentProps {
  stack: cdk.Stack;
  userPool: IUserPool;
  userPoolClient: IUserPoolClient;
  nameSuffix?: string;
}

export function createVoiceAgent({ stack, userPool, userPoolClient, nameSuffix }: VoiceAgentProps) {
  const isSandbox = !process.env.AWS_BRANCH;

  let agentRuntimeArtifact: agentcore.AgentRuntimeArtifact;
  let containerImageBuild: ContainerImageBuild | undefined;

  if (isSandbox) {
    agentRuntimeArtifact = agentcore.AgentRuntimeArtifact.fromAsset(
      path.join(__dirname, 'runtime')
    );
  } else {
    containerImageBuild = new ContainerImageBuild(stack, 'VoiceAgentImageBuild', {
      directory: path.join(__dirname, 'runtime'),
      platform: Platform.LINUX_ARM64,
    });
    (containerImageBuild.repository as ecr.Repository).addLifecycleRule({
      description: 'Keep last 5 images',
      maxImageCount: 5,
      rulePriority: 1,
    });
    agentRuntimeArtifact = agentcore.AgentRuntimeArtifact.fromEcrRepository(
      containerImageBuild.repository,
      containerImageBuild.imageTag,
    );
  }

  // SSE（HTTP POST）なので JWT 認証が使える
  const discoveryUrl = `https://cognito-idp.${stack.region}.amazonaws.com/${userPool.userPoolId}/.well-known/openid-configuration`;

  const runtimeName = nameSuffix ? `voice_agent_${nameSuffix}` : 'voice_agent';

  const runtime = new agentcore.Runtime(stack, 'VoiceAgentRuntime', {
    runtimeName,
    agentRuntimeArtifact,
    authorizerConfiguration: agentcore.RuntimeAuthorizerConfiguration.usingJWT(
      discoveryUrl,
      [userPoolClient.userPoolClientId],
    ),
    environmentVariables: {
      BYPASS_TOOL_CONSENT: 'true',
      // Observability（OTEL）
      AGENT_OBSERVABILITY_ENABLED: 'true',
      OTEL_PYTHON_DISTRO: 'aws_distro',
      OTEL_PYTHON_CONFIGURATOR: 'aws_configurator',
      OTEL_EXPORTER_OTLP_PROTOCOL: 'http/protobuf',
    },
  });

  if (containerImageBuild) {
    runtime.node.addDependency(containerImageBuild);
  }

  // Bedrock モデル呼び出し権限
  runtime.addToRolePolicy(new iam.PolicyStatement({
    actions: [
      'bedrock:InvokeModel',
      'bedrock:InvokeModelWithResponseStream',
    ],
    resources: [
      'arn:aws:bedrock:*::foundation-model/*',
      'arn:aws:bedrock:*:*:inference-profile/*',
    ],
  }));

  new cdk.CfnOutput(stack, 'VoiceAgentRuntimeArn', {
    value: runtime.agentRuntimeArn,
    description: 'Voice Agent Runtime ARN',
  });

  return { runtime };
}
