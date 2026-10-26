using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;

namespace Campaign1934.Runtime.Tests
{
    public sealed class BattleRuntimeSmokeTests
    {
        [UnityTest]
        public IEnumerator BootstrapSceneCreatesRuntimeAndKeepsBotBudget()
        {
            SceneManager.LoadScene("Bootstrap");
            yield return null;
            yield return null;
            Assert.That(Object.FindObjectOfType<BattleRuntime>(), Is.Not.Null);
            Assert.That(Object.FindObjectsOfType<BotAgent>().Length, Is.InRange(15, 20));
            Assert.That(Object.FindObjectsOfType<ProjectionScreen>().Length, Is.EqualTo(3));
            LogAssert.NoUnexpectedReceived();
        }
    }
}
