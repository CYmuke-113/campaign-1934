using Campaign1934.Core;
using UnityEngine;

namespace Campaign1934.Runtime
{
    public sealed class SoldierAvatar : MonoBehaviour
    {
        private Transform torso, head, leftArm, rightArm, leftLeg, rightLeg, rifle;
        private BotPosture posture;
        private bool moving;
        private float gait;

        public void Build(Faction faction, Material uniform)
        {
            Material skin = CreateMaterial("Skin", new Color(0.34f, 0.24f, 0.17f));
            Material leather = CreateMaterial("Leather", new Color(0.07f, 0.045f, 0.025f));
            Material redBand = CreateMaterial("Red Armband", new Color(0.52f, 0.018f, 0.012f));
            Material helmet = faction == Faction.Red ? uniform : CreateMaterial("Steel Helmet", new Color(0.12f, 0.14f, 0.09f));

            torso = Part("Torso", PrimitiveType.Cube, transform, new Vector3(0f, 1.35f, 0f), new Vector3(0.56f, 0.74f, 0.32f), uniform);
            head = Part("Head", PrimitiveType.Sphere, transform, new Vector3(0f, 2.02f, 0f), new Vector3(0.34f, 0.38f, 0.34f), skin);
            Part(faction == Faction.Red ? "Cloth Cap" : "Helmet", PrimitiveType.Sphere, head, new Vector3(0f, 0.18f, 0f), new Vector3(1.08f, 0.42f, 1.08f), helmet);
            leftArm = Limb("Left Arm", transform, new Vector3(-0.43f, 1.5f, 0f), uniform);
            rightArm = Limb("Right Arm", transform, new Vector3(0.43f, 1.5f, 0f), uniform);
            leftLeg = Limb("Left Leg", transform, new Vector3(-0.18f, 0.55f, 0f), uniform, true);
            rightLeg = Limb("Right Leg", transform, new Vector3(0.18f, 0.55f, 0f), uniform, true);
            Part("Backpack", PrimitiveType.Cube, torso, new Vector3(0f, 0f, 0.28f), new Vector3(0.72f, 0.75f, 0.22f), leather);
            rifle = Part("Rifle", PrimitiveType.Cube, torso, new Vector3(0.28f, 0.02f, -0.34f), new Vector3(0.08f, 0.08f, 1.45f), leather);
            rifle.localRotation = Quaternion.Euler(0f, 0f, -8f);
            if (faction == Faction.Red)
                Part("Red Armband", PrimitiveType.Cylinder, leftArm, new Vector3(0f, 0.15f, 0f), new Vector3(0.26f, 0.07f, 0.26f), redBand);
        }

        public void SetState(BotPosture nextPosture, bool isMoving)
        {
            posture = nextPosture;
            moving = isMoving;
        }

        private void Update()
        {
            if (torso == null) return;
            float targetGait = moving ? 1f : 0f;
            gait = Mathf.MoveTowards(gait, targetGait, Time.deltaTime * 6f);
            float cycle = Mathf.Sin(Time.time * (posture == BotPosture.Prone ? 5f : 9f)) * gait;
            float limbAngle = posture == BotPosture.Prone ? 14f : 32f;
            leftLeg.localRotation = Quaternion.Euler(cycle * limbAngle, 0f, 0f);
            rightLeg.localRotation = Quaternion.Euler(-cycle * limbAngle, 0f, 0f);
            leftArm.localRotation = Quaternion.Euler(-cycle * limbAngle * 0.65f, 0f, 8f);
            rightArm.localRotation = Quaternion.Euler(cycle * limbAngle * 0.65f, 0f, -8f);

            Vector3 targetScale = Vector3.one;
            Vector3 targetPosition = Vector3.zero;
            Quaternion targetRotation = Quaternion.identity;
            if (posture == BotPosture.Crouch)
            {
                targetScale = new Vector3(1f, 0.72f, 1f);
                targetPosition.y = -0.18f;
                torso.localRotation = Quaternion.Slerp(torso.localRotation, Quaternion.Euler(18f, 0f, 0f), Time.deltaTime * 9f);
            }
            else if (posture == BotPosture.Prone)
            {
                targetScale = new Vector3(1f, 0.74f, 1f);
                targetPosition = new Vector3(0f, -0.64f, -0.2f);
                targetRotation = Quaternion.Euler(76f, 0f, 0f);
            }
            else torso.localRotation = Quaternion.Slerp(torso.localRotation, Quaternion.identity, Time.deltaTime * 9f);
            transform.localScale = Vector3.Lerp(transform.localScale, targetScale, Time.deltaTime * 9f);
            transform.localPosition = Vector3.Lerp(transform.localPosition, targetPosition, Time.deltaTime * 9f);
            transform.localRotation = Quaternion.Slerp(transform.localRotation, targetRotation, Time.deltaTime * 9f);
        }

        private static Transform Limb(string name, Transform parent, Vector3 position, Material material, bool leg = false)
        {
            Transform limb = Part(name, PrimitiveType.Capsule, parent, position, leg ? new Vector3(0.18f, 0.48f, 0.18f) : new Vector3(0.15f, 0.42f, 0.15f), material);
            return limb;
        }

        private static Transform Part(string name, PrimitiveType primitive, Transform parent, Vector3 position, Vector3 scale, Material material)
        {
            GameObject part = GameObject.CreatePrimitive(primitive);
            part.name = name;
            part.transform.SetParent(parent, false);
            part.transform.localPosition = position;
            part.transform.localScale = scale;
            part.GetComponent<Renderer>().sharedMaterial = material;
            Collider collider = part.GetComponent<Collider>();
            if (collider != null) Destroy(collider);
            return part.transform;
        }

        private static Material CreateMaterial(string name, Color color)
        {
            Material material = new Material(Shader.Find("Universal Render Pipeline/Lit")) { name = name, color = color, enableInstancing = true };
            material.SetFloat("_Smoothness", 0.2f);
            return material;
        }
    }
}
