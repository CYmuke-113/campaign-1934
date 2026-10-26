using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;
using System.Linq;

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
            Assert.That(Object.FindObjectsOfType<SoldierAvatar>().Length, Is.InRange(15, 20));
            ProjectionScreen[] screens = Object.FindObjectsOfType<ProjectionScreen>();
            Assert.That(screens.Length, Is.EqualTo(3));
            Assert.That(screens.Select(screen => screen.VideoFile).Distinct().Count(), Is.EqualTo(3));
            LogAssert.NoUnexpectedReceived();
        }
    }
}
